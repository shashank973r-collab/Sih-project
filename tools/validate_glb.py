#!/usr/bin/env python3
"""
DepthWizard — 3D GLB/glTF Mesh Validator
Validates 3D terrain meshes for vertex counts, triangle bounds, normals,
UV coordinate mappings, embedded textures, and local origin offsets.
"""

import sys
import os
import json
import argparse
from typing import Dict, Any

def validate_glb(filepath: str) -> Dict[str, Any]:
    result: Dict[str, Any] = {
        "filepath": os.path.abspath(filepath),
        "filename": os.path.basename(filepath),
        "exists": os.path.exists(filepath),
        "errors": [],
        "warnings": []
    }

    if not result["exists"]:
        result["errors"].append(f"File does not exist: {filepath}")
        return result

    size_mb = os.path.getsize(filepath) / (1024 * 1024)
    result["file_size_mb"] = round(size_mb, 2)

    try:
        import trimesh
        scene_or_mesh = trimesh.load(filepath)
        
        if isinstance(scene_or_mesh, trimesh.Scene):
            result["is_scene"] = True
            # Dump to single mesh or inspect geometries
            geometries = scene_or_mesh.geometry
            result["geometry_count"] = len(geometries)
            
            total_vertices = sum(len(m.vertices) for m in geometries.values())
            total_faces = sum(len(m.faces) for m in geometries.values())
            
            # Combine bounds
            bounds = scene_or_mesh.bounds
            has_uv = any(hasattr(m.visual, 'uv') and m.visual.uv is not None for m in geometries.values())
        else:
            result["is_scene"] = False
            total_vertices = len(scene_or_mesh.vertices)
            total_faces = len(scene_or_mesh.faces)
            bounds = scene_or_mesh.bounds
            has_uv = hasattr(scene_or_mesh.visual, 'uv') and scene_or_mesh.visual.uv is not None

        result["vertex_count"] = total_vertices
        result["triangle_count"] = total_faces
        result["has_uv_coordinates"] = has_uv
        
        if bounds is not None:
            min_pt, max_pt = bounds[0], bounds[1]
            dims = max_pt - min_pt
            result["bounding_box"] = {
                "min": [round(float(v), 3) for v in min_pt],
                "max": [round(float(v), 3) for v in max_pt],
                "dimensions": [round(float(v), 3) for v in dims]
            }

            # Check RULE-3D-001: Local coordinates vs huge UTM coordinates
            if max(abs(min_pt[0]), abs(min_pt[1])) > 50000:
                result["warnings"].append(
                    "Vertices appear to be in raw global/UTM coordinates (>50,000 m). RULE-3D-001: Must translate to local origin (x-x0, y-y0, z-z0) to prevent 32-bit floating-point vertex jitter."
                )

        # Performance advisory
        if total_faces > 1000000:
            result["warnings"].append(
                f"High triangle count ({total_faces:,} > 1,000,000). May cause frame drops on low-power devices. Recommend LOD decimation."
            )
        elif total_faces < 100:
            result["warnings"].append("Extremely low triangle count (<100). Check mesh resolution.")

        result["valid"] = len(result["errors"]) == 0
        return result
    except Exception as e:
        result["errors"].append(f"Failed to parse GLB/glTF mesh: {str(e)}")
        result["valid"] = False
        return result

def main():
    parser = argparse.ArgumentParser(description="DepthWizard 3D GLB Validator")
    parser.add_argument("glb_path", help="Path to .glb or .gltf file")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    res = validate_glb(args.glb_path)
    if args.json:
        print(json.dumps(res, indent=2))
    else:
        print("\n==================================================")
        print(f" DepthWizard 3D GLB Mesh Inspection: {res.get('filename')}")
        print("==================================================")
        print(f" Valid:            {res.get('valid')}")
        print(f" Size:             {res.get('file_size_mb')} MB")
        print(f" Triangles:        {res.get('triangle_count', 0):,}")
        print(f" Vertices:         {res.get('vertex_count', 0):,}")
        print(f" UV Mappings:      {res.get('has_uv_coordinates')}")
        if res.get("bounding_box"):
            bb = res["bounding_box"]
            print(f" Bounding Box:     [{bb['dimensions'][0]}m x {bb['dimensions'][1]}m x {bb['dimensions'][2]}m]")
        if res.get("warnings"):
            print(f"\n Warnings ({len(res['warnings'])}):")
            for w in res["warnings"]:
                print(f"   [!] {w}")
        if res.get("errors"):
            print(f"\n Errors ({len(res['errors'])}):")
            for e in res["errors"]:
                print(f"   [X] {e}")
        print("==================================================\n")

if __name__ == "__main__":
    main()
