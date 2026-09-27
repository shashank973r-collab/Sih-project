"""
Unit Tests for DepthWizard 3D Mesh Exporter and RULE-3D-001 Validation
"""

import os
import tempfile
import pytest
import numpy as np
from PIL import Image

from DepthWizard.backend.mesh_export import export_terrain_to_glb
from DepthWizard.tools.validate_glb import validate_glb

def test_export_terrain_to_glb_rule_3d_001():
    # 1. Create synthetic elevation grid with large coordinates
    h, w = 64, 64
    elevation = np.random.uniform(500.0, 750.0, (h, w)).astype(np.float32)
    texture = Image.new("RGB", (w, h), color=(100, 150, 80))
    
    with tempfile.TemporaryDirectory() as tmpdir:
        glb_path = os.path.join(tmpdir, "test_mesh.glb")
        
        # Export with GSD = 0.5m
        out_path, meta = export_terrain_to_glb(
            elevation_grid=elevation,
            rgb_texture=texture,
            output_path=glb_path,
            gsd_m=0.5,
            max_resolution=64
        )
        
        assert os.path.exists(glb_path)
        assert os.path.getsize(glb_path) > 1000 # Valid binary GLB
        assert meta["vertices_count"] == h * w
        assert meta["faces_count"] > 0
        
        # RULE-3D-001 Check: Centered around local origin
        bbox = meta["bbox"]
        assert abs(bbox["min_x"] + bbox["max_x"]) < 1.0 # Centered around x=0
        assert abs(bbox["min_z"] + bbox["max_z"]) < 1.0 # Centered around z=0
        assert max(abs(bbox["min_x"]), abs(bbox["max_x"])) < 50000.0 # No UTM raw offsets
        
        # Run validate_glb inspection
        val_result = validate_glb(glb_path)
        assert val_result["valid"] is True
        assert val_result["vertex_count"] == h * w
        assert val_result["has_uv_coordinates"] is True
        assert len(val_result["errors"]) == 0
