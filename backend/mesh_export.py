"""
DepthWizard GLB Terrain Mesh Exporter
Adheres strictly to RULE-3D-001: All vertices translated to local origin (x - x0, y - y0, z - z0)
to prevent 32-bit floating-point vertex jitter on WebGL GPUs.
"""

import os
from typing import Tuple, Optional
import numpy as np
from PIL import Image
import trimesh


def export_terrain_to_glb(
    elevation_grid: np.ndarray,
    rgb_texture: Image.Image,
    output_path: str,
    gsd_m: float = 0.5,
    max_resolution: int = 512,
    vertical_scale: float = 1.0,
) -> Tuple[str, dict]:
    """
    Constructs a textured 3D terrain surface and exports to GLB format.

    Args:
        elevation_grid: 2D array of heights [H, W] in meters (or normalized [0, 1])
        rgb_texture: PIL RGB Image corresponding to the elevation area
        output_path: Destination .glb filepath
        gsd_m: Ground sampling distance in meters per pixel
        max_resolution: Maximum grid dimension for the export mesh
        vertical_scale: Optional multiplier for vertical relief

    Returns:
        (output_path, metadata_dict)
    """
    h_orig, w_orig = elevation_grid.shape

    # Downsample if grid exceeds max_resolution for WebGL efficiency
    step = max(1, int(max(h_orig, w_orig) / max_resolution))
    grid = elevation_grid[::step, ::step].astype(np.float32)
    h, w = grid.shape

    # Resize texture to match or scale
    tex_w = min(1024, rgb_texture.width)
    tex_h = min(1024, rgb_texture.height)
    tex_resized = rgb_texture.resize((tex_w, tex_h), Image.Resampling.BILINEAR)

    # Compute metric grid extents
    dx = gsd_m * step
    dy = gsd_m * step

    # RULE-3D-001: Calculate local origin at mesh center
    x_coords = np.arange(w, dtype=np.float32) * dx
    z_coords = np.arange(h, dtype=np.float32) * dy
    x0 = float(np.mean(x_coords))
    z0 = float(np.mean(z_coords))
    y0 = float(np.nanmedian(grid))

    # Center coordinates around local origin
    x_centered = x_coords - x0
    z_centered = z_coords - z0
    y_centered = (grid - y0) * vertical_scale

    # Build vertex array: (H, W, 3) -> (H*W, 3)
    xv, zv = np.meshgrid(x_centered, z_centered)
    vertices = np.stack([xv, y_centered, zv], axis=-1).reshape(-1, 3)

    # Build UV coordinates: (H, W, 2) -> (H*W, 2)
    u = np.linspace(0.0, 1.0, w, dtype=np.float32)
    v = np.linspace(1.0, 0.0, h, dtype=np.float32) # Invert for glTF UV convention
    uv_u, uv_v = np.meshgrid(u, v)
    uvs = np.stack([uv_u, uv_v], axis=-1).reshape(-1, 2)

    # Build faces (triangulated quads)
    faces = []
    for r in range(h - 1):
        for c in range(w - 1):
            i0 = r * w + c
            i1 = i0 + 1
            i2 = (r + 1) * w + c
            i3 = i2 + 1
            # Triangle 1
            faces.append([i0, i2, i1])
            # Triangle 2
            faces.append([i1, i2, i3])
    faces = np.array(faces, dtype=np.int32)

    # Create Trimesh geometry with texture visual
    material = trimesh.visual.material.PBRMaterial(
        baseColorTexture=tex_resized,
        roughnessFactor=0.85,
        metallicFactor=0.1
    )
    visual = trimesh.visual.TextureVisuals(
        uv=uvs,
        image=tex_resized,
        material=material
    )

    mesh = trimesh.Trimesh(
        vertices=vertices,
        faces=faces,
        visual=visual,
        process=False
    )

    # Ensure parent output directory exists
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    # Export to GLB
    glb_bytes = trimesh.exchange.gltf.export_glb(mesh)
    with open(output_path, 'wb') as f:
        f.write(glb_bytes)

    metadata = {
        "vertices_count": int(len(vertices)),
        "faces_count": int(len(faces)),
        "local_origin": {"x0": x0, "y0": y0, "z0": z0},
        "bbox": {
            "min_x": float(vertices[:, 0].min()),
            "max_x": float(vertices[:, 0].max()),
            "min_y": float(vertices[:, 1].min()),
            "max_y": float(vertices[:, 1].max()),
            "min_z": float(vertices[:, 2].min()),
            "max_z": float(vertices[:, 2].max())
        },
        "file_size_bytes": os.path.getsize(output_path)
    }

    return output_path, metadata
