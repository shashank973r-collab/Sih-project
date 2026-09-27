#!/usr/bin/env python3
"""
DepthWizard — Quantitative DSM Evaluation Tool
Computes RMSE, MAE, Pearson r, signed bias, p90 error, and class-stratified metrics
against reference ground truth as required by official SIH-26175 rubric.
"""

import sys
import os
import json
import argparse
import numpy as np
from typing import Dict, Any, Optional

def compute_metrics(
    pred: np.ndarray,
    target: np.ndarray,
    mask: Optional[np.ndarray] = None,
    classes: Optional[np.ndarray] = None,
    class_labels: Optional[Dict[int, str]] = None
) -> Dict[str, Any]:
    """
    Computes elevation accuracy metrics between predicted and reference rasters.
    """
    valid = (~np.isnan(pred)) & (~np.isnan(target)) & (target > -9000)
    if mask is not None:
        valid = valid & mask
        
    p_val = pred[valid].astype(np.float64)
    t_val = target[valid].astype(np.float64)
    
    if len(p_val) == 0:
        return {"error": "No valid overlapping pixels between prediction and reference."}

    diff = p_val - t_val
    abs_diff = np.abs(diff)
    
    mae = float(np.mean(abs_diff))
    rmse = float(np.sqrt(np.mean(diff ** 2)))
    signed_bias = float(np.mean(diff))
    median_ae = float(np.median(abs_diff))
    p90_ae = float(np.percentile(abs_diff, 90))
    p95_ae = float(np.percentile(abs_diff, 95))
    
    # Pearson Correlation Coefficient
    std_p, std_t = np.std(p_val), np.std(t_val)
    if std_p > 1e-7 and std_t > 1e-7:
        r_corr = float(np.corrcoef(p_val, t_val)[0, 1])
    else:
        r_corr = 0.0

    result = {
        "valid_pixels": int(len(p_val)),
        "rmse_m": round(rmse, 4),
        "mae_m": round(mae, 4),
        "pearson_r": round(r_corr, 4),
        "signed_bias_m": round(signed_bias, 4),
        "median_ae_m": round(median_ae, 4),
        "p90_ae_m": round(p90_ae, 4),
        "p95_ae_m": round(p95_ae, 4),
        "min_pred_m": round(float(np.min(p_val)), 2),
        "max_pred_m": round(float(np.max(p_val)), 2),
        "min_target_m": round(float(np.min(t_val)), 2),
        "max_target_m": round(float(np.max(t_val)), 2)
    }

    # Class-stratified evaluation if classes map is provided
    if classes is not None:
        stratified = {}
        c_val = classes[valid]
        labels = class_labels or {0: "Ground/Road", 1: "Building", 2: "Vegetation", 3: "Water"}
        
        for c_id, c_name in labels.items():
            c_mask = (c_val == c_id)
            if np.sum(c_mask) > 10:
                c_diff = diff[c_mask]
                stratified[c_name] = {
                    "pixel_count": int(np.sum(c_mask)),
                    "mae_m": round(float(np.mean(np.abs(c_diff))), 4),
                    "rmse_m": round(float(np.sqrt(np.mean(c_diff ** 2))), 4),
                    "bias_m": round(float(np.mean(c_diff)), 4)
                }
        result["stratified_classes"] = stratified

    return result

def main():
    parser = argparse.ArgumentParser(description="DepthWizard DSM Evaluation Calculator")
    parser.add_argument("--pred", required=True, help="Predicted DSM GeoTIFF path")
    parser.add_argument("--target", required=True, help="Ground Truth reference DSM GeoTIFF path")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    args = parser.parse_args()

    import rasterio
    with rasterio.open(args.pred) as src_p, rasterio.open(args.target) as src_t:
        p_arr = src_p.read(1)
        t_arr = src_t.read(1)

    metrics = compute_metrics(p_arr, t_arr)
    
    if args.json:
        print(json.dumps(metrics, indent=2))
    else:
        print("\n==================================================")
        print(" DepthWizard Elevation Metric Evaluation")
        print("==================================================")
        print(f" Valid Pixels:     {metrics.get('valid_pixels', 0):,}")
        print(f" RMSE:             {metrics.get('rmse_m')} m  (Target: <= 3.5 m)")
        print(f" MAE:              {metrics.get('mae_m')} m   (Target: <= 2.2 m)")
        print(f" Pearson r:        {metrics.get('pearson_r')}     (Target: >= 0.90)")
        print(f" Signed Bias:      {metrics.get('signed_bias_m')} m")
        print(f" p90 Error:        {metrics.get('p90_ae_m')} m")
        print(f" Elevation Range:  Pred [{metrics.get('min_pred_m')}, {metrics.get('max_pred_m')}] m")
        print(f"                   Ref  [{metrics.get('min_target_m')}, {metrics.get('max_target_m')}] m")
        if "stratified_classes" in metrics:
            print("\n Stratified Performance by Class:")
            for c_name, c_data in metrics["stratified_classes"].items():
                print(f"   * {c_name:<14} MAE: {c_data['mae_m']} m | RMSE: {c_data['rmse_m']} m (n={c_data['pixel_count']})")
        print("==================================================\n")

if __name__ == "__main__":
    main()
