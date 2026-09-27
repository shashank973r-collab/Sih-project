#!/usr/bin/env python3
"""
DepthWizard — Geospatial Raster Validator
Inspects and validates GeoTIFF rasters for CRS, geotransform, nodata,
bounds, dimensions, and radiometric properties according to RULE-GEO-001..004.
"""

import sys
import os
import json
import argparse
from typing import Dict, Any, Optional

def inspect_raster(filepath: str) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "filepath": os.path.abspath(filepath),
        "filename": os.path.basename(filepath),
        "exists": os.path.exists(filepath),
        "is_georeferenced": False,
        "format": "Unknown",
        "errors": [],
        "warnings": []
    }

    if not result["exists"]:
        result["errors"].append(f"File not found: {filepath}")
        return result

    file_size_mb = os.path.getsize(filepath) / (1024 * 1024)
    result["file_size_mb"] = round(file_size_mb, 2)

    # Try rasterio first
    has_rasterio = False
    try:
        import rasterio
        from rasterio.crs import CRS
        has_rasterio = True
    except ImportError:
        pass

    if has_rasterio:
        try:
            with rasterio.open(filepath) as src:
                result["format"] = src.driver
                result["width"] = src.width
                result["height"] = src.height
                result["count"] = src.count
                result["dtypes"] = [str(dtype) for dtype in src.dtypes]
                result["nodata"] = src.nodata
                
                # Check CRS
                if src.crs:
                    result["is_georeferenced"] = True
                    result["crs_epsg"] = src.crs.to_epsg()
                    result["crs_wkt"] = src.crs.to_string()
                    result["is_projected"] = src.crs.is_projected
                    result["is_geographic"] = src.crs.is_geographic
                    result["linear_units"] = src.crs.linear_units if hasattr(src.crs, "linear_units") else "unknown"
                    
                    if src.crs.is_geographic:
                        result["warnings"].append(
                            "CRS is geographic (degrees/EPSG:4326). RULE-GEO-002: Must reproject to projected (UTM) CRS before computing metric slope or elevation distances."
                        )
                else:
                    result["is_georeferenced"] = False
                    result["warnings"].append(
                        "No CRS detected. RULE-GEO-001: Image must be processed in Relative Mode (rDSM) with normalized [0, 1] units, NOT meters."
                    )

                # Check Geotransform
                transform = src.transform
                result["transform"] = list(transform) if transform else None
                if transform:
                    res_x = abs(transform[0])
                    res_y = abs(transform[4])
                    result["pixel_resolution"] = [round(res_x, 4), round(res_y, 4)]
                    if res_x == 0 or res_y == 0:
                        result["errors"].append("Invalid affine transform: pixel resolution is zero.")
                
                # Bounds
                bounds = src.bounds
                result["bounds"] = {
                    "left": bounds.left,
                    "bottom": bounds.bottom,
                    "right": bounds.right,
                    "top": bounds.top
                }

                # Sample Statistics (read safely)
                import numpy as np
                stats = []
                for b_idx in range(1, src.count + 1):
                    # Read overview or decimated if large
                    step = max(1, int(max(src.width, src.height) / 1024))
                    data = src.read(b_idx, out_shape=(src.height // step, src.width // step))
                    
                    if src.nodata is not None:
                        valid_mask = (data != src.nodata) & (~np.isnan(data))
                    else:
                        valid_mask = ~np.isnan(data)
                        
                    valid_data = data[valid_mask]
                    if valid_data.size > 0:
                        stats.append({
                            "band": b_idx,
                            "min": float(np.min(valid_data)),
                            "max": float(np.max(valid_data)),
                            "mean": float(np.mean(valid_data)),
                            "std": float(np.std(valid_data)),
                            "valid_percent": round(float(valid_data.size / data.size) * 100, 2)
                        })
                    else:
                        stats.append({
                            "band": b_idx,
                            "empty_or_all_nodata": True
                        })
                        result["warnings"].append(f"Band {b_idx} contains no valid data pixels.")
                result["band_statistics"] = stats
                result["valid"] = len(result["errors"]) == 0
                return result
        except Exception as e:
            result["errors"].append(f"rasterio failed to open {filepath}: {str(e)}")

    # Fallback to PIL or tifffile if rasterio is unavailable or failed
    try:
        from PIL import Image
        with Image.open(filepath) as img:
            result["format"] = img.format
            result["width"] = img.width
            result["height"] = img.height
            result["count"] = len(img.getbands())
            result["bands"] = list(img.getbands())
            result["is_georeferenced"] = False
            result["warnings"].append("Opened with PIL. No georeferencing metadata found. Mode: Relative rDSM.")
            result["valid"] = True
            return result
    except Exception as e:
        result["errors"].append(f"PIL fallback failed: {str(e)}")

    result["valid"] = False
    return result

def main():
    parser = argparse.ArgumentParser(description="DepthWizard GeoTIFF Validator")
    parser.add_argument("raster_path", help="Path to input GeoTIFF or image file")
    parser.add_argument("--json", action="store_true", help="Output results strictly as JSON")
    args = parser.parse_args()

    res = inspect_raster(args.raster_path)

    if args.json:
        print(json.dumps(res, indent=2))
    else:
        print(f"\n==================================================")
        print(f" DepthWizard Raster Inspection: {res.get('filename')}")
        print(f"==================================================")
        print(f" Status:           {'VALID' if res.get('valid') else 'INVALID'}")
        print(f" Georeferenced:    {res.get('is_georeferenced')}")
        print(f" Dimensions:       {res.get('width')} x {res.get('height')} (Bands: {res.get('count')})")
        print(f" Format/Driver:    {res.get('format')}")
        if res.get("crs_epsg"):
            print(f" CRS (EPSG):       EPSG:{res.get('crs_epsg')} ({'Projected' if res.get('is_projected') else 'Geographic'})")
        if res.get("pixel_resolution"):
            print(f" Resolution:       {res.get('pixel_resolution')[0]}m x {res.get('pixel_resolution')[1]}m")
        if res.get("nodata") is not None:
            print(f" NoData Value:     {res.get('nodata')}")
        if res.get("band_statistics"):
            print(f" Band Statistics:")
            for b in res["band_statistics"]:
                if "min" in b:
                    print(f"   Band {b['band']}: min={b['min']:.2f}, max={b['max']:.2f}, mean={b['mean']:.2f}, valid={b['valid_percent']}%")
        if res.get("warnings"):
            print(f"\n Warnings ({len(res['warnings'])}):")
            for w in res["warnings"]:
                print(f"   [!] {w}")
        if res.get("errors"):
            print(f"\n Errors ({len(res['errors'])}):")
            for err in res["errors"]:
                print(f"   [X] {err}")
        print(f"==================================================\n")

if __name__ == "__main__":
    main()
