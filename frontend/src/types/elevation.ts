export type CalibrationLevel = 
  | 'level_0_relative'       // Uncalibrated / non-georeferenced (PNG/JPG)
  | 'level_1_srtm'           // SRTM 30m Global DEM Anchoring
  | 'level_2_gcp'            // Sparse Ground Control Points
  | 'level_3_learned_ndsm';  // Learned nDSM + Terrain Fusion

export type ShaderMode = 
  | 'rgb'          // True Color Satellite Texture
  | 'colormap'     // Dynamic Turbo / Viridis / Terrain Palette
  | 'hillshade'    // Dynamic Sun Shaded Relief
  | 'uncertainty'  // Model Disagreement / Variance Heatmap
  | 'wireframe';   // Diagnostic Triangulation Mesh

export type CameraMode = 'orbit' | 'drone';

export interface GeoTIFFMetadata {
  isGeoreferenced: boolean;
  filename: string;
  crs: string;
  epsg: number | null;
  bounds: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  gsd_m: number; // Ground Sample Distance (meters/pixel)
  dimensions: {
    width: number;
    height: number;
  };
  datum: string;
}

export interface GroundControlPoint {
  id: string;
  x: number;
  y: number;
  lat?: number;
  lon?: number;
  height_m: number;
  residual_m?: number;
}

export interface HeightProbeData {
  pixelX: number;
  pixelY: number;
  worldX: number;
  worldZ: number;
  elevation: number;        // Either physical meters or relative %
  isMetric: boolean;
  slopeDeg: number;
  aspectDeg: number;
  uncertainty_m?: number;
  coords?: {
    lat: number;
    lon: number;
  };
}

export interface ElevationProfilePoint {
  distance_m: number;
  elevation: number;
  dsm: number;
  dtm: number;
  ndsm: number;
  slope_deg: number;
}

export interface BiomeMetrics {
  mae: number;
  rmse: number;
  pearson_r: number;
  sampleCount: number;
}

export interface ModelValidationReport {
  overall_mae: number;
  overall_rmse: number;
  overall_pearson_r: number;
  baseline_affine_rmse: number;
  biomes: {
    urban_dense: BiomeMetrics;
    urban_sparse: BiomeMetrics;
    hilly: BiomeMetrics;
    forest: BiomeMetrics;
    flat: BiomeMetrics;
  };
}

export interface ElevationSceneData {
  width: number;
  height: number;
  elevationGrid: Float32Array;   // Height values
  dtmGrid: Float32Array;         // Bare-earth terrain
  ndsmGrid: Float32Array;        // Relative structure (buildings/trees)
  uncertaintyGrid: Float32Array;  // Std deviation / error
  minElevation: number;
  maxElevation: number;
  isMetric: boolean;
  metadata: GeoTIFFMetadata;
  textureCanvas: HTMLCanvasElement;
  sourceImageSrc: string;
}
