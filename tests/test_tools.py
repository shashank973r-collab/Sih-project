"""
Unit & Integration Tests for DepthWizard Geospatial & Calibration Tools
Covers validate_geotiff, validate_glb, solve_calibration, and calc_dsm_metrics.
"""

import os
import csv
import pytest
import numpy as np

from DepthWizard.tools.validate_geotiff import inspect_raster
from DepthWizard.tools.validate_glb import validate_glb
from DepthWizard.tools.solve_calibration import (
    solve_relative_level0,
    solve_dem_huber_level1,
    solve_gcp_level2,
    assemble_dsm_level3
)
from DepthWizard.tools.calc_dsm_metrics import compute_metrics

TEST_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

def test_validate_geotiff_synthetic():
    optical_tif = os.path.join(TEST_DATA_DIR, "synthetic_optical.tif")
    if not os.path.exists(optical_tif):
        pytest.skip("Synthetic optical raster not found")
        
    res = inspect_raster(optical_tif)
    assert res["exists"] is True
    assert res["is_georeferenced"] is True
    assert res["crs_epsg"] == 32644
    assert res["width"] == 512
    assert res["height"] == 512
    assert len(res["errors"]) == 0

def test_validate_geotiff_missing_file():
    res = inspect_raster("non_existent_raster.tif")
    assert res["exists"] is False
    assert len(res["errors"]) > 0

def test_solve_calibration_level0_relative():
    raw_depth = np.random.uniform(10.0, 150.0, (100, 100)).astype(np.float32)
    norm, meta = solve_relative_level0(raw_depth, invert=True)
    assert norm.shape == (100, 100)
    assert norm.min() >= -1e-6
    assert norm.max() <= 1.0 + 1e-6
    assert meta["calibration_level"] == 0
    assert meta["is_metric"] is False

def test_solve_calibration_level1_huber():
    # Simulate true elevation H = 2.5 * z + 650.0 + noise
    z_rel = np.linspace(0.1, 1.0, 1000).reshape(100, 10)
    h_true = 2.5 * z_rel + 650.0 + np.random.normal(0, 0.2, (100, 10))
    
    cal_dsm, meta = solve_dem_huber_level1(z_rel, h_true)
    assert meta["calibration_level"] == 1
    assert meta["is_metric"] is True
    assert abs(meta["scale_a"] - 2.5) < 0.1
    assert abs(meta["shift_b"] - 650.0) < 1.0
    assert meta["huber_mae_m"] < 1.0
    assert meta["pearson_r"] > 0.95

def test_solve_calibration_level2_gcp():
    gcp_csv = os.path.join(TEST_DATA_DIR, "synthetic_gcps.csv")
    if not os.path.exists(gcp_csv):
        pytest.skip("GCP CSV not found")
        
    gcps = []
    with open(gcp_csv, 'r') as f:
        reader = csv.DictReader(f)
        for r in reader:
            gcps.append({
                "id": r.get("gcp_id") or r.get("id", "GCP"),
                "x": float(r["pixel_x"]),
                "y": float(r["pixel_y"]),
                "height_m": float(r["height_m"])
            })
            
    assert len(gcps) >= 3
    # Synthetic relative depth array
    rel_depth = np.full((512, 512), 0.5, dtype=np.float32)
    for g in gcps:
        px, py = int(g["x"]), int(g["y"])
        # Map height 640..700 to 0.2..0.8
        rel_depth[py, px] = (g["height_m"] - 600.0) / 100.0
        
    cal_dsm, meta = solve_gcp_level2(rel_depth, gcps)
    assert meta["calibration_level"] == 2
    assert meta["is_metric"] is True
    assert meta["gcp_total"] == len(gcps)
    assert "gcp_rmse_m" in meta

def test_calc_dsm_metrics_accuracy():
    target = np.full((100, 100), 500.0, dtype=np.float64)
    pred = target + 2.0 # Constant 2m bias
    metrics = compute_metrics(pred, target)
    assert metrics["mae_m"] == 2.0
    assert metrics["rmse_m"] == 2.0
    assert metrics["signed_bias_m"] == 2.0
    assert metrics["valid_pixels"] == 10000

def test_assemble_dsm_level3():
    dtm = np.full((50, 50), 700.0, dtype=np.float32)
    ndsm = np.zeros((50, 50), dtype=np.float32)
    ndsm[20:30, 20:30] = 15.0 # 15m building
    
    dsm, meta = assemble_dsm_level3(dtm, ndsm)
    assert meta["calibration_level"] == 3
    assert dsm[0, 0] == 700.0
    assert dsm[25, 25] == 715.0
    assert meta["max_structure_height_m"] == 15.0
