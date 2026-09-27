import { create } from 'zustand';
import { 
  CalibrationLevel, 
  ShaderMode, 
  CameraMode, 
  ElevationSceneData, 
  HeightProbeData, 
  ElevationProfilePoint,
  GroundControlPoint,
  ModelValidationReport
} from '../types/elevation';
import { generateSyntheticRemoteSensingScene, PresetAOI } from '../utils/terrainGenerator';

export type ColormapPalette = 'turbo' | 'viridis' | 'terrain' | 'plasma';

interface DepthWizardState {
  // Theme & Polish
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Processing & Data
  sceneData: ElevationSceneData | null;
  selectedAoi: PresetAOI;
  calibrationLevel: CalibrationLevel;
  isProcessing: boolean;
  processingProgress: number;
  statusMessage: string;

  // Viewport Settings & Shaders
  shaderMode: ShaderMode;
  cameraMode: CameraMode;
  verticalExaggeration: number;
  sunAzimuthDeg: number;
  sunElevationDeg: number;
  fps: number;
  contourInterval: number;
  slopeThresholdDeg: number;
  colormapPalette: ColormapPalette;

  // Disaster Scenarios
  activeScenario: 'none' | 'flood' | 'landslide';
  floodLevel: number;

  // Analysis Tools
  activeTool: 'none' | 'probe' | 'profile';
  heightProbe: HeightProbeData | null;
  profilePoints: Array<{ x: number; z: number }>;
  elevationProfile: ElevationProfilePoint[] | null;

  // GCPs
  gcps: GroundControlPoint[];

  // Validation Report
  validationReport: ModelValidationReport;

  // UI Panels
  leftPanelOpen: boolean;
  rightDrawerOpen: boolean;
  profileDrawerOpen: boolean;
  helpModalOpen: boolean;

  // Actions
  setSelectedAoi: (aoi: PresetAOI) => void;
  setCalibrationLevel: (level: CalibrationLevel) => void;
  setShaderMode: (mode: ShaderMode) => void;
  setCameraMode: (mode: CameraMode) => void;
  setVerticalExaggeration: (scale: number) => void;
  setSunAngles: (azimuth: number, elevation: number) => void;
  setContourInterval: (interval: number) => void;
  setSlopeThresholdDeg: (deg: number) => void;
  setColormapPalette: (palette: ColormapPalette) => void;
  setFps: (fps: number) => void;
  setActiveScenario: (scenario: 'none' | 'flood' | 'landslide') => void;
  setFloodLevel: (lvl: number) => void;
  setActiveTool: (tool: 'none' | 'probe' | 'profile') => void;
  setHeightProbe: (probe: HeightProbeData | null) => void;
  addProfilePoint: (pt: { x: number; z: number }) => void;
  clearProfile: () => void;
  setElevationProfile: (profile: ElevationProfilePoint[] | null) => void;
  setLeftPanelOpen: (open: boolean) => void;
  setRightDrawerOpen: (open: boolean) => void;
  setProfileDrawerOpen: (open: boolean) => void;
  setHelpModalOpen: (open: boolean) => void;
  loadSceneData: (data: ElevationSceneData) => void;
  addGcp: (gcp: GroundControlPoint) => void;
  removeGcp: (id: string) => void;
  triggerMockInference: (isMetric: boolean) => void;
}

const defaultReport: ModelValidationReport = {
  overall_mae: 1.84,
  overall_rmse: 2.92,
  overall_pearson_r: 0.941,
  baseline_affine_rmse: 5.68,
  biomes: {
    urban_dense: { mae: 2.31, rmse: 3.45, pearson_r: 0.925, sampleCount: 1420 },
    urban_sparse: { mae: 1.62, rmse: 2.54, pearson_r: 0.952, sampleCount: 1890 },
    hilly: { mae: 1.95, rmse: 2.87, pearson_r: 0.948, sampleCount: 960 },
    forest: { mae: 2.45, rmse: 3.82, pearson_r: 0.887, sampleCount: 1120 },
    flat: { mae: 0.88, rmse: 1.34, pearson_r: 0.984, sampleCount: 840 },
  }
};

const initialGcps: GroundControlPoint[] = [
  { id: 'GCP-01', x: 45, y: 62, lat: 30.2912, lon: 78.0221, height_m: 765.4, residual_m: 0.42 },
  { id: 'GCP-02', x: 180, y: 95, lat: 30.3165, lon: 78.0484, height_m: 812.1, residual_m: -0.31 },
  { id: 'GCP-03', x: 120, y: 210, lat: 30.3334, lon: 78.0615, height_m: 940.8, residual_m: 0.58 },
  { id: 'GCP-04', x: 220, y: 220, lat: 30.3411, lon: 78.0728, height_m: 1025.3, residual_m: -0.19 },
  { id: 'GCP-05', x: 80, y: 150, lat: 30.3082, lon: 78.0350, height_m: 710.0, residual_m: 0.12 },
];

export const useDepthWizardStore = create<DepthWizardState>((set, get) => ({
  // Default to light laboratory theme, toggleable to aerospace dark
  theme: 'light',
  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: next });
  },

  sceneData: generateSyntheticRemoteSensingScene(256, 256, true, 'dehradun'),
  selectedAoi: 'dehradun',
  calibrationLevel: 'level_1_srtm',
  isProcessing: false,
  processingProgress: 100,
  statusMessage: 'Ready (Dehradun Himalayan Foothills Loaded)',

  shaderMode: 'rgb',
  cameraMode: 'orbit',
  verticalExaggeration: 1.8,
  sunAzimuthDeg: 138.5,
  sunElevationDeg: 44.2,
  fps: 60,
  contourInterval: 10,
  slopeThresholdDeg: 30,
  colormapPalette: 'turbo',

  activeScenario: 'none',
  floodLevel: 720,

  activeTool: 'none',
  heightProbe: null,
  profilePoints: [],
  elevationProfile: null,

  gcps: initialGcps,
  validationReport: defaultReport,

  leftPanelOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  rightDrawerOpen: false,
  profileDrawerOpen: false,
  helpModalOpen: false,

  setSelectedAoi: (aoi) => {
    const nextScene = generateSyntheticRemoteSensingScene(256, 256, true, aoi);
    set({
      selectedAoi: aoi,
      sceneData: nextScene,
      statusMessage: `Loaded AOI: ${nextScene.metadata.filename}`,
      floodLevel: nextScene.minElevation + (nextScene.maxElevation - nextScene.minElevation) * 0.25,
      heightProbe: null,
      profilePoints: [],
      elevationProfile: null,
    });
  },

  setCalibrationLevel: (level) => set({ calibrationLevel: level }),
  setShaderMode: (mode) => set({ shaderMode: mode }),
  // Profile picking is disabled in drone mode, so drop any open profile drawer
  // when switching to it rather than leaving it stacked over the drone HUD.
  setCameraMode: (mode) => set((state) => ({
    cameraMode: mode,
    profileDrawerOpen: mode === 'drone' ? false : state.profileDrawerOpen,
  })),
  setVerticalExaggeration: (scale) => set({ verticalExaggeration: scale }),
  setSunAngles: (azimuth, elevation) => set({ sunAzimuthDeg: azimuth, sunElevationDeg: elevation }),
  setContourInterval: (interval) => set({ contourInterval: interval }),
  setSlopeThresholdDeg: (deg) => set({ slopeThresholdDeg: deg }),
  setColormapPalette: (palette) => set({ colormapPalette: palette }),
  setFps: (fps) => set({ fps }),
  setActiveScenario: (scenario) => set({ activeScenario: scenario }),
  setFloodLevel: (lvl) => set({ floodLevel: lvl }),
  setActiveTool: (tool) => {
    if (tool === 'profile') {
      set({ activeTool: tool, profilePoints: [], elevationProfile: null });
    } else {
      set({ activeTool: tool });
    }
  },
  setHeightProbe: (probe) => set({ heightProbe: probe }),
  addProfilePoint: (pt) => {
    const current = get().profilePoints;
    const next = [...current, pt];
    set({ profilePoints: next });
  },
  clearProfile: () => set({ profilePoints: [], elevationProfile: null, profileDrawerOpen: false }),
  setElevationProfile: (profile) => set({ elevationProfile: profile, profileDrawerOpen: true }),
  setLeftPanelOpen: (open) => set({ leftPanelOpen: open }),
  setRightDrawerOpen: (open) => set({ rightDrawerOpen: open }),
  setProfileDrawerOpen: (open) => set({ profileDrawerOpen: open }),
  setHelpModalOpen: (open) => set({ helpModalOpen: open }),
  loadSceneData: (data) => set({ sceneData: data, isProcessing: false, statusMessage: 'Scene Loaded' }),
  addGcp: (gcp) => set((state) => ({ gcps: [...state.gcps, gcp] })),
  removeGcp: (id) => set((state) => ({ gcps: state.gcps.filter(g => g.id !== id) })),

  triggerMockInference: (isMetric: boolean) => {
    set({ isProcessing: true, processingProgress: 10, statusMessage: 'Extracting foundation depth features (Depth Anything V2)...' });

    setTimeout(() => {
      set({ processingProgress: 45, statusMessage: isMetric ? 'Anchoring scale with SRTM 30m terrain raster...' : 'Normalizing relative elevation map...' });
    }, 500);

    setTimeout(() => {
      set({ processingProgress: 80, statusMessage: isMetric ? 'Decomposing DSM = DTM (Terrain) + nDSM (Structures)...' : 'Generating relative height field...' });
    }, 1000);

    setTimeout(() => {
      const nextScene = generateSyntheticRemoteSensingScene(256, 256, isMetric, get().selectedAoi);
      set({
        sceneData: nextScene,
        isProcessing: false,
        processingProgress: 100,
        statusMessage: `Inference complete (${isMetric ? 'Metric DSM in meters' : 'Relative rDSM'})`,
        heightProbe: null,
        profilePoints: [],
        elevationProfile: null
      });
    }, 1500);
  }
}));
