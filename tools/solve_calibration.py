#!/usr/bin/env python3
"""
DepthWizard — Elevation Calibration Solver
Implements Level 0 (Relative), Level 1 (Robust Huber DEM), Level 2 (Sparse GCP),
and Level 3 (DTM + nDSM Residual Assembly) according to Section 19 & 25 of the architecture.
"""

import sys
import os
import json
import argparse
import numpy as np
from typing import Dict, Any, Tuple, Optional, List

def solve_relative_level0(relative_depth: np.ndarray, invert: bool = True) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Level 0 — Relative only (PNG/JPG inputs).
    Normalizes relative depth to [0, 1] without physical units (RULE-GEO-001).
    """
    valid_mask = ~np.isnan(relative_depth)
    if not np.any(valid_mask):
        raise ValueError("Relative depth array contains only NaN/invalid values.")
    
    vals = relative_depth[valid_mask]
    min_v, max_v = float(np.min(vals)), float(np.max(vals))
    
    if max_v - min_v < 1e-6:
        normalized = np.zeros_like(relative_depth, dtype=np.float32)
    else:
        normalized = (relative_depth - min_v) / (max_v - min_v)
        
    if invert:
        # If model outputs inverse depth (disparity), invert so higher values = higher elevation
        normalized = 1.0 - normalized
        
    metadata = {
        "calibration_level": 0,
        "calibration_name": "Relative Normalization",
        "units": "unitless_ratio",
        "min_raw": min_v,
        "max_raw": max_v,
        "is_metric": False,
        "inverted": invert
    }
    return normalized.astype(np.float32), metadata

def solve_dem_huber_level1(
    relative_depth: np.ndarray,
    reference_dem: np.ndarray,
    terrain_mask: Optional[np.ndarray] = None,
    huber_epsilon: float = 1.35
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Level 1 — Global affine DEM calibration using Huber robust regression.
    Minimizes Huber loss: H_dem = a * z_rel + b + epsilon
    Using stable ground terrain pixels to prevent buildings/forest from distorting base slope.
    """
    valid_mask = (~np.isnan(relative_depth)) & (~np.isnan(reference_dem)) & (reference_dem > -9000)
    if terrain_mask is not None:
        valid_mask = valid_mask & terrain_mask
        
    z_rel = relative_depth[valid_mask]
    h_dem = reference_dem[valid_mask]
    
    if len(z_rel) < 10:
        raise ValueError(f"Insufficient valid calibration pixels ({len(z_rel)} < 10) for Level 1 DEM calibration.")

    # Subsample if large
    if len(z_rel) > 50000:
        indices = np.random.choice(len(z_rel), 50000, replace=False)
        z_sample = z_rel[indices]
        h_sample = h_dem[indices]
    else:
        z_sample = z_rel
        h_sample = h_dem

    # Use HuberRegressor from scikit-learn
    from sklearn.linear_model import HuberRegressor, RANSACRegressor
    huber = HuberRegressor(epsilon=huber_epsilon, max_iter=300)
    X = z_sample.reshape(-1, 1)
    y = h_sample
    huber.fit(X, y)
    
    scale_a = float(huber.coef_[0])
    shift_b = float(huber.intercept_)
    
    # Calculate residuals and metrics on sample
    preds = huber.predict(X)
    residuals = y - preds
    mae = float(np.mean(np.abs(residuals)))
    rmse = float(np.sqrt(np.mean(residuals ** 2)))
    
    # Pearson r
    r_corr = float(np.corrcoef(preds, y)[0, 1]) if np.std(preds) > 1e-6 and np.std(y) > 1e-6 else 0.0

    # Apply calibration across full raster
    calibrated_dsm = scale_a * relative_depth + shift_b
    calibrated_dsm[np.isnan(relative_depth)] = np.nan

    metadata = {
        "calibration_level": 1,
        "calibration_name": "Huber Robust DEM Affine",
        "units": "meters",
        "is_metric": True,
        "scale_a": round(scale_a, 6),
        "shift_b": round(shift_b, 4),
        "sample_points": int(len(z_sample)),
        "huber_mae_m": round(mae, 3),
        "huber_rmse_m": round(rmse, 3),
        "pearson_r": round(r_corr, 4),
        "outlier_count": int(np.sum(huber.outliers_)) if hasattr(huber, "outliers_") else 0
    }
    return calibrated_dsm.astype(np.float32), metadata

def solve_gcp_level2(
    relative_depth: np.ndarray,
    gcps: List[Dict[str, float]],
    outlier_threshold_m: float = 10.0
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Level 2 — Sparse GCP calibration.
    gcps format: [{"id": 1, "x": 100, "y": 200, "height_m": 850.5}, ...]
    Fits H_i = a * z_i + b using RANSAC/Huber and detects outlier GCPs.
    """
    if len(gcps) < 3:
        raise ValueError(f"At least 3 valid Ground Control Points required for Level 2 calibration; got {len(gcps)}.")

    z_vals = []
    h_vals = []
    point_ids = []
    
    h_img, w_img = relative_depth.shape[:2]
    
    for pt in gcps:
        px, py, h_m = int(round(pt["x"])), int(round(pt["y"])), float(pt["height_m"])
        if 0 <= px < w_img and 0 <= py < h_img:
            z_sample = float(relative_depth[py, px])
            if not np.isnan(z_sample):
                z_vals.append(z_sample)
                h_vals.append(h_m)
                point_ids.append(pt.get("id", len(point_ids) + 1))

    if len(z_vals) < 3:
        raise ValueError("Fewer than 3 GCP points landed on valid non-NaN pixels.")

    X = np.array(z_vals).reshape(-1, 1)
    y = np.array(h_vals)

    from sklearn.linear_model import HuberRegressor
    reg = HuberRegressor()
    reg.fit(X, y)
    
    scale_a = float(reg.coef_[0])
    shift_b = float(reg.intercept_)
    
    preds = reg.predict(X)
    resids = np.abs(y - preds)
    
    gcp_report = []
    for pid, y_true, y_pred, res in zip(point_ids, y, preds, resids):
        is_outlier = bool(res > outlier_threshold_m)
        gcp_report.append({
            "id": pid,
            "height_gt_m": round(float(y_true), 2),
            "height_pred_m": round(float(y_pred), 2),
            "residual_m": round(float(res), 2),
            "is_outlier": is_outlier
        })

    calibrated_dsm = scale_a * relative_depth + shift_b
    calibrated_dsm[np.isnan(relative_depth)] = np.nan

    metadata = {
        "calibration_level": 2,
        "calibration_name": "Sparse GCP Linear Calibration",
        "units": "meters",
        "is_metric": True,
        "scale_a": round(scale_a, 6),
        "shift_b": round(shift_b, 4),
        "gcp_total": len(gcps),
        "gcp_valid": len(z_vals),
        "gcp_rmse_m": round(float(np.sqrt(np.mean(resids ** 2))), 3),
        "gcp_mae_m": round(float(np.mean(resids)), 3),
        "gcp_details": gcp_report
    }
    return calibrated_dsm.astype(np.float32), metadata

def assemble_dsm_level3(
    dtm_terrain: np.ndarray,
    ndsm_structure: np.ndarray
) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Level 3 / Core Architecture: DSM = DTM + nDSM
    Combines low-frequency bare-earth terrain with learned structural heights (RULE-GEO-004).
    """
    # Clip structural heights to non-negative (structures stand above bare-earth terrain)
    ndsm_clean = np.maximum(0.0, ndsm_structure)
    dsm = dtm_terrain + ndsm_clean
    
    metadata = {
        "calibration_level": 3,
        "calibration_name": "DTM + nDSM Residual Assembly",
        "formula": "DSM = DTM + max(0, nDSM)",
        "units": "meters",
        "is_metric": True,
        "mean_terrain_m": round(float(np.nanmean(dtm_terrain)), 2),
        "max_structure_height_m": round(float(np.nanmax(ndsm_clean)), 2),
        "mean_structure_height_m": round(float(np.nanmean(ndsm_clean)), 2)
    }
    return dsm.astype(np.float32), metadata

if __name__ == "__main__":
    print("DepthWizard Elevation Calibration Solver module loaded successfully.")
