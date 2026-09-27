"""
FastAPI Backend Integration Tests for DepthWizard
Tests health check, elevation estimation, point probing, and artifact downloads.
"""

import os
import io
import pytest
from PIL import Image
import numpy as np
from fastapi.testclient import TestClient

from DepthWizard.backend.main import app

client = TestClient(app)
TEST_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def test_api_health():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["isro_problem_statement"] == "26175"

def test_estimate_elevation_png_level0():
    # Create simple in-memory PNG
    img = Image.new("RGB", (64, 64), color=(120, 180, 90))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    
    files = {"image": ("test_optical.png", buf, "image/png")}
    data = {"calibration_mode": "level_0_relative"}
    
    res = client.post("/api/v1/elevation/estimate", files=files, data=data)
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["status"] == "completed"
    assert res_data["is_metric"] is False
    assert res_data["min_elevation"] >= 0.0
    assert res_data["max_elevation"] <= 1.0
    assert "glb_url" in res_data
    assert "job_id" in res_data
    
    # Test point probing on this job
    job_id = res_data["job_id"]
    probe_res = client.get(f"/api/v1/elevation/probe?job_id={job_id}&x=0.5&y=0.5")
    assert probe_res.status_code == 200
    p_data = probe_res.json()
    assert "elevation" in p_data
    assert "slope" in p_data
    assert "aspect" in p_data
    assert p_data["is_metric"] is False

def test_estimate_elevation_synthetic_geotiff():
    optical_tif = os.path.join(TEST_DATA_DIR, "synthetic_optical.tif")
    if not os.path.exists(optical_tif):
        pytest.skip("synthetic_optical.tif not found")
        
    with open(optical_tif, "rb") as f:
        files = {"image": ("synthetic_optical.tif", f, "image/tiff")}
        data = {"calibration_mode": "level_1_srtm"}
        res = client.post("/api/v1/elevation/estimate", files=files, data=data)
        
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["status"] == "completed"
    assert res_data["is_metric"] is True
    assert res_data["crs"] == "EPSG:32644"
    assert res_data["gsd_m"] > 0
    assert "metrics" in res_data
    
    # Test GLB download
    glb_filename = os.path.basename(res_data["glb_url"])
    dl_res = client.get(f"/api/v1/elevation/download/{glb_filename}")
    assert dl_res.status_code == 200
    assert len(dl_res.content) > 1000

def test_probe_out_of_bounds_or_missing_job():
    res = client.get("/api/v1/elevation/probe?job_id=non-existent-job&x=0.5&y=0.5")
    assert res.status_code == 404
