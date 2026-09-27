# DepthWizard — Single-View Height Estimation & 3D Flythrough
### ISRO SIH 2026 (Problem Statement 26175)

An enterprise-grade, interactive 3D WebGL / Three.js remote-sensing elevation intelligence platform developed for ISRO's Disaster Management & Elevation Mapping challenge.

---

## 🌟 Key Features

### 1. Ingestion & Multi-Tier Scale Calibration
- **Dual Format Support:**
  - Non-georeferenced images (`PNG`, `JPG`): Generates relative surface height maps (**rDSM**, 0–100%) with explicit non-metric user guards.
  - Georeferenced images (`GeoTIFF`): Parses EPSG CRS, bounding box, resolution (GSD), and maps scale to physical metric elevation.
- **Hierarchical Calibration Tiers:**
  - **Level 0 (Relative):** Normalized scale-agnostic terrain.
  - **Level 1 (SRTM 30m Anchoring):** Robust Huber regression against coarse base DEM.
  - **Level 2 (Sparse GCP Fitting):** Precise millimeter-level ground anchor points with residual tracking.
  - **Level 3 (Decomposition):** $\text{DSM} = \text{DTM (Terrain)} + \text{nDSM (Structures)}$.

### 2. High-Performance Three.js 3D Viewport
- **Dual Camera Control:**
  - **Orbit Mode:** Smooth rotation, inspection, and zoom.
  - **Drone Flythrough Mode:** First-person aerial flight with WASD strafing, Space/Shift vertical thrusters, PointerLock mouse look, artificial horizon HUD, real-time speed (m/s), and altitude (AGL).
- **Multi-Mode Visualization Shaders:**
  - `True Color (RGB)`: Drapes satellite optical photo over 3D terrain.
  - `Elevation Colormap`: Turbo/Viridis gradient with dynamic meter legend.
  - `Hillshade (Shaded Relief)`: Directional sun lighting with adjustable Azimuth and Elevation angles.
  - `Uncertainty / Confidence Map`: Error variance and LiDAR delta heatmap.
  - `Wireframe Mesh`: Diagnostic triangulation grid.

### 3. Analytical GIS Overlay Tools
- **Height Probe:** Click anywhere on the mesh to inspect:
  - Absolute Elevation ($m$ MSL) or Relative Surface Height ($\%$)
  - Local Slope (degrees) & Aspect (0–360°)
  - Uncertainty confidence ($\pm \sigma$)
  - Projected WGS84 Lat/Lon coordinates
- **Cross-Section Elevation Transect:** Click points across the terrain to render an interactive 2D distance-vs-elevation profile graph showing DSM surface vs DTM bare-earth relief.
- **Vertical Exaggeration Slider:** Adjust height emphasis from $0.5\times$ to $4.0\times$.

### 4. Export Capabilities
- **GLB / glTF 3D Mesh:** Direct in-browser export with embedded texture.
- **GeoTIFF Raster:** 32-bit float elevation raster with preserved geospatial metadata.

---

## 🚀 Running the Project

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Build for production
npm run build
```

---

## 🔌 Backend Integration

The frontend includes an API client in `src/services/api.ts` connecting to:
- `POST http://localhost:8000/api/v1/elevation/estimate`
- `GET http://localhost:8000/api/v1/elevation/probe`

If the backend is not yet started, the frontend automatically falls back to its built-in realistic procedural simulation engine.
