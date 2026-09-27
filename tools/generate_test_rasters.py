#!/usr/bin/env python3
"""
DepthWizard — Synthetic Geospatial Test Data Generator
Generates realistic multi-band optical RGB GeoTIFF, ground-truth DSM GeoTIFF,
coarse SRTM-like 30m DEM GeoTIFF, Ground Control Points (GCP) CSV, and non-georeferenced PNG
to test Level 0, Level 1, Level 2, and Level 3 pipeline capabilities.
"""

import os
import csv
import numpy as np
from PIL import Image

def generate_test_suite(output_dir: str, size: int = 512, gsd_m: float = 0.5):
    os.makedirs(output_dir, exist_ok=True)
    
    import rasterio
    from rasterio.transform import from_origin
    from rasterio.enums import Resampling

    print(f"Generating DepthWizard synthetic test data in {output_dir}...")
    
    # 1. Coordinate frame: Dehradun / Western Himalayas Foothills (UTM Zone 44N - EPSG:32644)
    # Origin: Easting = 215000, Northing = 3360000
    epsg_code = 32644
    x_origin = 215000.0
    y_origin = 3360000.0
    transform = from_origin(x_origin, y_origin, gsd_m, gsd_m)

    # 2. Base terrain (DTM): Sloped valley with rolling hills (elevation ~ 620 m to 680 m)
    y_coords, x_coords = np.mgrid[0:size, 0:size]
    # Smooth macroscopic terrain
    terrain_dtm = 640.0 + (x_coords * 0.04) - (y_coords * 0.03) + (15.0 * np.sin(x_coords / 40.0) * np.cos(y_coords / 50.0))
    terrain_dtm = terrain_dtm.astype(np.float32)

    # 3. Add Structural elements (nDSM): Buildings, Trees, Roads, River
    ndsm_structure = np.zeros((size, size), dtype=np.float32)
    semantic_mask = np.zeros((size, size), dtype=np.uint8) # 0: Ground, 1: Road, 2: Building, 3: Tree, 4: Water
    rgb_image = np.zeros((size, size, 3), dtype=np.uint8)

    # Ground color (light beige/soil/grass)
    rgb_image[:, :] = [145, 160, 115]

    # River running diagonally
    river_path = (x_coords - y_coords * 0.4 - 100) ** 2 < 18 ** 2
    ndsm_structure[river_path] = -0.5
    semantic_mask[river_path] = 4
    rgb_image[river_path] = [45, 85, 120] # Blue-grey water

    # Roads (asphalt dark grey)
    road_h = (np.abs(y_coords - 256) < 8)
    road_v = (np.abs(x_coords - 200) < 8)
    road_mask = (road_h | road_v) & (~river_path)
    semantic_mask[road_mask] = 1
    rgb_image[road_mask] = [70, 72, 75]

    # Buildings (clusters of rectangular structures with heights 8m to 35m)
    np.random.seed(42)
    buildings = [
        # (x, y, w, h, height_m, color)
        (50, 50, 45, 35, 18.5, [190, 80, 70]),   # Terracotta roof
        (110, 60, 30, 40, 12.0, [210, 205, 195]),# Flat concrete roof
        (70, 120, 50, 40, 24.0, [80, 100, 140]), # Blue metal roof
        (280, 100, 60, 50, 32.0, [220, 215, 200]),# Tall commercial block
        (360, 120, 40, 40, 15.0, [180, 90, 75]),
        (250, 280, 35, 30, 9.5,  [200, 190, 175]),
        (300, 300, 55, 45, 22.0, [195, 75, 65]),
        (380, 290, 40, 60, 28.5, [215, 215, 220]),
        (80, 320, 45, 45, 16.0,  [175, 85, 80]),
        (140, 340, 30, 30, 11.0, [205, 200, 190]),
        (270, 400, 70, 45, 35.0, [90, 115, 150]) # High-rise tower
    ]

    for bx, by, bw, bh, b_height, b_col in buildings:
        bx2, by2 = min(size, bx + bw), min(size, by + bh)
        ndsm_structure[by:by2, bx:bx2] = b_height
        semantic_mask[by:by2, bx:bx2] = 2
        rgb_image[by:by2, bx:bx2] = b_col

    # Trees / Canopy patches (heights 6m to 14m)
    for _ in range(40):
        tx = np.random.randint(20, size - 20)
        ty = np.random.randint(20, size - 20)
        radius = np.random.randint(6, 18)
        t_mask = ((x_coords - tx) ** 2 + (y_coords - ty) ** 2) < radius ** 2
        # Only place if not road or building
        valid_tree = t_mask & (semantic_mask == 0)
        ndsm_structure[valid_tree] = np.random.uniform(7.0, 13.0)
        semantic_mask[valid_tree] = 3
        rgb_image[valid_tree] = [35, np.random.randint(85, 115), 35]

    # Full Ground Truth DSM = DTM + nDSM
    dsm_ground_truth = terrain_dtm + np.maximum(0.0, ndsm_structure)

    # 4. Coarse DEM (SRTM 30m simulation):
    # Downsample DTM to ~30m resolution (factor of 60 for 0.5m GSD), then resample back
    # Contains macro-terrain without fine structures
    ds_factor = max(2, int(30.0 / gsd_m))
    coarse_grid = terrain_dtm[::ds_factor, ::ds_factor]
    # Smooth interpolation back
    from scipy.ndimage import zoom
    coarse_dem = zoom(coarse_grid, (size / coarse_grid.shape[0], size / coarse_grid.shape[1]), order=1).astype(np.float32)

    # 5. Save Optical RGB GeoTIFF
    optical_tif = os.path.join(output_dir, "synthetic_optical.tif")
    with rasterio.open(
        optical_tif,
        "w",
        driver="GTiff",
        height=size,
        width=size,
        count=3,
        dtype="uint8",
        crs=rasterio.crs.CRS.from_epsg(epsg_code),
        transform=transform
    ) as dst:
        for b in range(3):
            dst.write(rgb_image[:, :, b], b + 1)
    print(f" -> Created: {optical_tif}")

    # 6. Save Ground Truth DSM GeoTIFF (float32 meters)
    dsm_tif = os.path.join(output_dir, "synthetic_dsm_gt.tif")
    with rasterio.open(
        dsm_tif,
        "w",
        driver="GTiff",
        height=size,
        width=size,
        count=1,
        dtype="float32",
        crs=rasterio.crs.CRS.from_epsg(epsg_code),
        transform=transform,
        nodata=-9999.0
    ) as dst:
        dst.write(dsm_ground_truth, 1)
    print(f" -> Created: {dsm_tif}")

    # 7. Save Coarse SRTM 30m DEM GeoTIFF
    srtm_tif = os.path.join(output_dir, "synthetic_srtm_30m.tif")
    with rasterio.open(
        srtm_tif,
        "w",
        driver="GTiff",
        height=size,
        width=size,
        count=1,
        dtype="float32",
        crs=rasterio.crs.CRS.from_epsg(epsg_code),
        transform=transform,
        nodata=-9999.0
    ) as dst:
        dst.write(coarse_dem, 1)
    print(f" -> Created: {srtm_tif}")

    # 8. Save Non-Georeferenced Optical PNG (for Level 0 Relative mode testing)
    png_path = os.path.join(output_dir, "synthetic_relative.png")
    Image.fromarray(rgb_image).save(png_path)
    print(f" -> Created: {png_path}")

    # 9. Generate Ground Control Points (GCP) CSV
    gcp_csv = os.path.join(output_dir, "synthetic_gcps.csv")
    gcps = [
        {"id": 1, "x": 100, "y": 80,  "pixel_x": 100, "pixel_y": 80,  "feature": "Road Intersection"},
        {"id": 2, "x": 200, "y": 256, "pixel_x": 200, "pixel_y": 256, "feature": "Bridge Access"},
        {"id": 3, "x": 420, "y": 100, "pixel_x": 420, "pixel_y": 100, "feature": "Open Ground Point"},
        {"id": 4, "x": 80,  "y": 420, "pixel_x": 80,  "pixel_y": 420, "feature": "Southern Field Point"},
        {"id": 5, "x": 450, "y": 450, "pixel_x": 450, "pixel_y": 450, "feature": "Hilltop Clearing Point"},
        {"id": 6, "x": 300, "y": 120, "pixel_x": 300, "pixel_y": 120, "feature": "Building Roof Corner"}
    ]

    import pyproj
    transformer = pyproj.Transformer.from_crs(f"EPSG:{epsg_code}", "EPSG:4326", always_xy=True)

    with open(gcp_csv, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "pixel_x", "pixel_y", "easting_m", "northing_m", "lon", "lat", "height_m", "feature"])
        for pt in gcps:
            px, py = pt["pixel_x"], pt["pixel_y"]
            h_m = float(dsm_ground_truth[py, px])
            east = x_origin + px * gsd_m
            north = y_origin - py * gsd_m
            lon, lat = transformer.transform(east, north)
            writer.writerow([pt["id"], px, py, round(east, 2), round(north, 2), round(lon, 6), round(lat, 6), round(h_m, 2), pt["feature"]])

    print(f" -> Created: {gcp_csv}")
    print("Test suite generation completed successfully.\n")

if __name__ == "__main__":
    test_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "tests", "data"))
    generate_test_suite(test_dir)
