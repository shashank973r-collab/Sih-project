# DepthWizard: 3D Elevation Intelligence for Single-View Satellite Imagery

An automated elevation reconstruction and interactive 3D terrain intelligence system built for ISRO Problem Statement 26175 (Smart India Hackathon 2026).

---

## Understanding the Problem

### The Operational Challenge
In emergency scenarios like flash floods, post-earthquake damage assessments, cloudbursts, and landslides, disaster response teams need elevation maps immediately. Knowing whether a road is submerged, which hillside is prone to slope failure, or how water will accumulate in a valley requires a three-dimensional surface model.

Traditional remote sensing builds Digital Surface Models (DSMs) using stereo satellite pairs (requiring multiple passes at different camera angles), airborne LiDAR surveys, or radar interferometry (InSAR). These methods have clear bottlenecks during active crises:
1. Multi-pass satellites can take days or weeks to revisit the target area under favorable weather.
2. Airborne LiDAR requires mobilizing aircraft, securing flight permissions, and flying over hazardous weather zones.
3. Stereo optical data is often unavailable for rapid-onset disasters where only a single optical pass was captured.

The core challenge posed by ISRO PS-26175 is simple: extract accurate, measurable three-dimensional terrain elevation directly from a single monocular optical satellite image (such as Cartosat or LISS-IV) without requiring a second camera angle or stereo pair.

### The 50/50 Evaluation Rubric
ISRO evaluates submissions across two equally weighted dimensions:
1. 50% DSM Estimation Accuracy: Metric consistency against ground reference data, preservation of topographic ridge lines and drainage channels, structural edge preservation, and low Root Mean Squared Error (RMSE).
2. 50% 3D Visualization and Practical Usability: Real-time interactive 3D performance (maintaining 60 frames per second), accurate optical texture draping over terrain meshes, intuitive elevation probing, cross-sectional profiling, and actionable disaster simulation tools.

---

## Our Solution

DepthWizard bridges deep learning computer vision and classical geodesy. It converts single-view optical imagery into metric Digital Surface Models and packages them into an interactive 3D terrain environment.

### Core Workflow
1. Monocular Elevation Estimation: The system takes a single 2D optical image and passes it through Depth Anything V2 to extract high-resolution relative depth representations with sharp boundary details.
2. Hierarchical Metric Calibration: Monocular depth models output scale-ambiguous values. DepthWizard resolves this ambiguity using a mathematical calibration pipeline ranging from Level 0 (relative normalized depth) up to Level 3 (hybrid calibration combining coarse regional DEMs and Ground Control Points).
3. Georeferenced Export: The calibrated elevation array is assembled into a standard GeoTIFF format carrying full affine geotransforms and spatial reference coordinates (such as EPSG:4326 or UTM projections).
4. Automated 3D Mesh Generation: The surface raster is triangulated into a continuous 3D mesh and packaged into standard glTF/GLB files adhering to the Y-up coordinate convention.
5. Interactive WebGL Viewport: Users can explore the terrain at 60 FPS in both light and dark themes, switch between optical texture drape, analytical hillshade, hypsometric tinting, and slope hazard views, or switch to a first-person drone flight camera.
6. Real-Time Disaster Simulation:
   - Flood Inundation Engine: An adjustable water plane computes submerged areas (in square kilometers) and estimated retained water volume (in million cubic meters) on the fly.
   - Landslide Runout Mapping: The terrain slope gradient is analyzed per vertex, identifying areas exceeding critical slope thresholds (30 to 45 degrees) and marking potential debris runout trajectories.

---

## Calibration Hierarchy

Because a single camera view lacks absolute metric scale, DepthWizard implements a four-level calibration engine:

* Level 0 (Relative Surface): Used for standard non-georeferenced images (PNG, JPEG). Output elevations are normalized to the [0, 1] range.
* Level 1 (Coarse Regional Anchor): Used when a coarse baseline DEM (such as 30-meter SRTM or Copernicus DEM) is available. The algorithm samples overlapping coordinates and runs Huber M-estimator regression to solve for metric scale and vertical shift while rejecting outlier vegetation heights.
* Level 2 (Ground Control Points): Used when survey-grade ground control coordinates are supplied via CSV. An affine transformation fits the relative depth values to measured benchmark elevations.
* Level 3 (Hybrid Anchor and GCP): Combines the regional trend surface from coarse DEMs with local precision offsets from ground control points, producing the lowest root mean squared error.

---

## Project Structure

```text
DepthWizard/
|-- backend/
|   |-- main.py              # FastAPI server, REST routes, job orchestration
|   |-- depth_engine.py      # Depth Anything V2 loader and inference pipeline
|   |-- pipeline.py          # Geospatial raster processing and calibration solver
|   |-- mesh_export.py       # Triangulated 3D mesh generation and GLB exporter
|   \-- outputs/             # Runtime storage for generated GeoTIFFs and GLBs
|-- frontend/
|   |-- src/
|   |   |-- components/      # UI panels: LeftPanel, RightPanel, TopBar, Viewport
|   |   |-- three/           # Three.js scene manager, camera rigs, terrain shaders
|   |   |-- App.tsx          # Main layout and disaster simulation state
|   |   \-- main.tsx         # Frontend application entry point
|   |-- package.json         # Frontend dependencies (React, Three.js, Lucide)
|   \-- vite.config.ts       # Vite configuration (port 8089)
|-- tools/
|   |-- solve_calibration.py # Standalone calibration solver CLI
|   |-- validate_geotiff.py  # GeoTIFF CRS, transform, and nodata validator
|   |-- validate_glb.py      # 3D GLB coordinate and geometry validator
|   |-- calc_dsm_metrics.py  # Accuracy calculation (RMSE, MAE, R2, Pearson)
|   \-- generate_test_rasters.py # Test data generator for validation
\-- tests/
    |-- test_api.py          # FastAPI endpoint integration tests
    |-- test_mesh_export.py  # 3D mesh formatting and Y-up orientation tests
    |-- test_tools.py        # Calibration and accuracy tool unit tests
    \-- data/                # Synthetic test rasters and ground control datasets
```

---

## Quickstart and Setup

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher (with npm)
- Recommended: NVIDIA GPU with CUDA support for faster neural network inference (CPU execution is supported as fallback)

### 1. Backend Setup

Open a terminal and navigate to the project directory:

```bash
cd DepthWizard

# Create and activate a Python virtual environment
python -m venv .venv

# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install required Python dependencies
pip install fastapi uvicorn rasterio numpy scipy torch torchvision pillow trimesh pygltflib pytest
```

Start the FastAPI backend server:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

The backend API will be available at `http://localhost:8000`. You can inspect the interactive OpenAPI documentation at `http://localhost:8000/docs`.

### 2. Frontend Setup

Open a second terminal window:

```bash
cd DepthWizard/frontend

# Install node dependencies
npm install

# Start the Vite development server
npm run dev
```

The frontend will run at `http://localhost:8089`. Open this URL in any modern web browser with WebGL support (Chrome, Edge, Firefox, or Safari).

### 3. Running the Test Suite

We maintain an automated pytest suite covering API endpoints, calibration logic, GeoTIFF geospatial compliance, and 3D mesh generation:

```bash
# Run tests from the project root
python -m pytest DepthWizard/tests -v
```

All 12 automated unit and integration tests should pass.

---

## Technical Deep Dive

### 1. Robust Huber Regression for Elevation Calibration
Direct ordinary least squares (OLS) regression fails when aligning monocular depth predictions with coarse elevation baselines because optical imagery contains tall buildings, trees, and localized shadows that do not exist in low-resolution 30-meter terrain grids.

To prevent tall structures from distorting the ground baseline, DepthWizard uses Huber loss optimization:

For each sample point with relative depth `d` and anchor elevation `h`, the residual is:
`r_i = h_i - (s * d_i + t)`

The loss function transitions from quadratic error for small residuals to linear error for large residuals:
- `0.5 * r_i^2` when `|r_i| <= delta`
- `delta * (|r_i| - 0.5 * delta)` when `|r_i| > delta`

This formulation automatically dampens the weight of outliers (such as tree canopies or urban towers) and recovers stable ground scale `s` and vertical shift `t`.

### 2. Geospatial Raster Integrity
The output Digital Surface Model is stored as a 32-bit floating point GeoTIFF (`float32`). Key geospatial rules enforced include:
- Strict Coordinate Reference System (CRS) preservation: If the input optical imagery carries spatial metadata (such as EPSG:4326 or UTM), that projection and its affine transform matrix are preserved in the output DSM.
- Clean NoData management: Edge padding and invalid sensor pixels are explicitly assigned standard NoData values (-9999.0) rather than zeros, preventing false valleys during slope calculations.
- Separation of Surface and Ground: The pipeline supports separating the Digital Surface Model (including buildings and tree canopies) from the bare-earth Digital Terrain Model (DTM) through localized morphological filtering.

### 3. Triangulated 3D Mesh Generation (RULE-3D-001)
To ensure the 3D terrain renders seamlessly in standard game engines, GIS software, and WebGL viewports, the mesh exporter follows strict photogrammetric rules:
- Regular Grid Triangulation: Vertex positions are generated across the raster dimensions, forming a continuous index buffer of counter-clockwise triangles.
- Y-Up Coordinate System: In remote sensing, elevation is typically the Z axis. Three.js and modern WebGL engines use Y as the vertical axis. DepthWizard maps (East, North, Elevation) to (X, Y, Z) coordinates with height assigned to Y and Z inverted to preserve correct real-world orientation.
- Compact Binary glTF (GLB): Meshes are packaged as binary glTF containers containing position coordinates, normal vectors, and UV texture coordinates mapped 1:1 with the optical satellite image.

### 4. GPU Shader Layers and Disaster Analytics
The WebGL viewport executes custom vertex and fragment shaders:
- Optical RGB Drape: Samples the source satellite photograph and maps it directly across the terrain surface with linear filtering.
- Analytical Hillshade: Simulates solar illumination based on user-defined azimuth and elevation angles, highlighting subtle geologic faults, terraces, and drainage patterns.
- Hypsometric Elevation Tint: Maps normalized vertex height to an earth-science color ramp (deep green for low valleys, transitioning through yellow and brown, up to white for high peaks).
- Slope Hazard Classification: Calculates the instantaneous angle between the surface normal and the vertical vector. Slopes steeper than 30 degrees are highlighted in amber, while slopes exceeding 45 degrees are highlighted in crimson red to denote acute landslide susceptibility.
- Interactive Flood Simulation: Renders a dynamic water plane with customizable wave motion. Vertices with heights below the current flood stage are overlaid with water color, while summary statistics report the flooded surface area and estimated water volume.

---

## API Reference

| Endpoint | Method | Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/health` | `GET` | None | Returns backend operational status and active model engine. |
| `/estimate-elevation` | `POST` | `file`, `calibration_level`, `anchor_dem`, `gcps` | Processes an optical image and returns job ID and accuracy metrics. |
| `/jobs/{job_id}/mesh` | `GET` | `job_id` | Downloads the generated 3D terrain mesh in binary GLB format. |
| `/jobs/{job_id}/dsm` | `GET` | `job_id` | Downloads the calibrated Digital Surface Model in GeoTIFF format. |
| `/probe` | `GET` | `job_id`, `x`, `y` | Returns the exact interpolated elevation at specified image coordinates. |

---

## Verification Tools

Inside the `DepthWizard/tools/` folder, several deterministic scripts can be run directly from the command line:

```bash
# Validate any GeoTIFF for CRS compliance, nodata presence, and valid pixel bounds:
python tools/validate_geotiff.py path/to/raster.tif

# Validate any GLB file for triangle validity, Y-up coordinates, and bounding boxes:
python tools/validate_glb.py path/to/model.glb

# Calculate quantitative accuracy metrics between an estimated DSM and ground truth:
python tools/calc_dsm_metrics.py --pred path/to/estimated.tif --gt path/to/reference.tif
```

---

## License & Competition Context
Developed for the Smart India Hackathon (SIH 2026) under Indian Space Research Organisation (ISRO) Problem Statement 26175.
