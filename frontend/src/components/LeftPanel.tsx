import React, { useRef, useState } from 'react';
import { 
  Upload, 
  FileCheck, 
  Sliders, 
  Download, 
  Info, 
  Layers, 
  Compass, 
  Sun, 
  AlertCircle,
  Eye,
  Activity,
  Waves,
  AlertTriangle
} from 'lucide-react';
import { useDepthWizardStore, ColormapPalette } from '../store/useDepthWizardStore';
import { CalibrationLevel, ShaderMode } from '../types/elevation';
import { exportSceneToGlb } from '../utils/exportGlb';
import { DepthWizardAPI } from '../services/api';

export const LeftPanel: React.FC<{ meshRef: React.MutableRefObject<any> }> = ({ meshRef }) => {
  const {
    sceneData,
    calibrationLevel,
    setCalibrationLevel,
    isProcessing,
    processingProgress,
    statusMessage,
    shaderMode,
    setShaderMode,
    verticalExaggeration,
    setVerticalExaggeration,
    sunAzimuthDeg,
    sunElevationDeg,
    setSunAngles,
    contourInterval,
    setContourInterval,
    slopeThresholdDeg,
    setSlopeThresholdDeg,
    colormapPalette,
    setColormapPalette,
    activeScenario,
    setActiveScenario,
    floodLevel,
    setFloodLevel,
    triggerMockInference,
    leftPanelOpen,
    gcps
  } = useDepthWizardStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('ISRO_DEHRADUN_HIMALAYAN_FOOTHILLS.tif');
  const [isGeoTiff, setIsGeoTiff] = useState<boolean>(true);
  const [isExportingGlb, setIsExportingGlb] = useState<boolean>(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isTiff = file.name.endsWith('.tif') || file.name.endsWith('.tiff');
    setSelectedFileName(file.name);
    setIsGeoTiff(isTiff);

    const mode = isTiff ? calibrationLevel : 'level_0_relative';
    if (!isTiff) {
      setCalibrationLevel('level_0_relative');
    } else {
      setCalibrationLevel('level_1_srtm');
    }

    triggerMockInference(isTiff);

    try {
      const res = await DepthWizardAPI.estimateElevation(file, mode);
      console.log('DepthWizard API Response:', res);
    } catch (err) {
      console.warn('Backend server offline or uncontactable:', err);
    }
  };

  const handleExportGlb = async () => {
    if (!meshRef.current) return;
    setIsExportingGlb(true);
    try {
      await exportSceneToGlb(meshRef.current, `DepthWizard_${selectedFileName.split('.')[0]}.glb`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingGlb(false);
    }
  };

  const handleExportGeoTiff = () => {
    alert("Exporting calibrated 32-bit Float DSM GeoTIFF with EPSG:32644 header (simulated download).");
  };

  if (!leftPanelOpen) return null;

  return (
    <aside className="w-80 border-r transition-colors duration-300 bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-md border-slate-200/80 dark:border-white/10 flex flex-col h-[calc(100vh-3.5rem)] z-20 overflow-y-auto select-none shadow-sm dark:shadow-none">
      <div className="p-4 space-y-6">
        
        {/* Upload Zone */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 font-mono">
            1. Imagery Ingestion
          </label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-cyan-500/80 rounded-2xl p-4 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-900/30 hover:bg-cyan-50/30 dark:hover:bg-cyan-950/20 group"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".tif,.tiff,.jpg,.jpeg,.png" 
              className="hidden" 
            />
            <Upload className="w-7 h-7 mx-auto text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors mb-2" />
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Click to upload optical imagery</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">GeoTIFF (.tif) or Standard PNG/JPG</p>
          </div>

          {/* Active file chip */}
          <div className="mt-2.5 p-2 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 truncate">
              <FileCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span className="truncate text-slate-800 dark:text-slate-200 font-mono text-[11px] font-medium">{selectedFileName}</span>
            </div>
            <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              isGeoTiff 
                ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20' 
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
            }`}>
              {isGeoTiff ? 'GeoTIFF' : 'Relative'}
            </span>
          </div>
        </div>

        {/* Processing State Progress */}
        {isProcessing && (
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 space-y-2">
            <div className="flex justify-between text-[11px] font-mono text-cyan-700 dark:text-cyan-300 font-bold">
              <span>ESTIMATING ELEVATION...</span>
              <span>{processingProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono truncate">{statusMessage}</p>
          </div>
        )}

        {/* Metadata Inspector (GeoTIFF only) */}
        {isGeoTiff && sceneData && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-mono">
            <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Raster Georeference Metadata</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>CRS:</span>
              <span className="text-slate-900 dark:text-slate-200 font-bold">{sceneData.metadata.crs.split(' ')[0]}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>GSD Resolution:</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">{sceneData.metadata.gsd_m} m / pixel</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Elev Range:</span>
              <span className="text-slate-900 dark:text-slate-200 font-bold">
                {sceneData.minElevation.toFixed(0)}m — {sceneData.maxElevation.toFixed(0)}m
              </span>
            </div>
          </div>
        )}

        {/* Calibration Mode Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-mono">
              2. Scale Calibration Tier
            </label>
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 font-bold">
              ISRO PS Hierarchy
            </span>
          </div>

          <div className="space-y-2">
            {[
              {
                id: 'level_0_relative' as CalibrationLevel,
                title: 'Level 0: Relative rDSM',
                desc: 'Normalized [0-1]. Mandatory for non-georeferenced imagery.',
                badge: 'Scale-Free',
                disabled: false
              },
              {
                id: 'level_1_srtm' as CalibrationLevel,
                title: 'Level 1: SRTM 30m Prior',
                desc: 'Robust Huber regression against low-frequency base DEM.',
                badge: 'Recommended',
                disabled: !isGeoTiff
              },
              {
                id: 'level_2_gcp' as CalibrationLevel,
                title: 'Level 2: Sparse GCP Fitting',
                desc: `Ground Control Points anchoring with residual tracking (${gcps.length} active).`,
                badge: 'High Precision',
                disabled: !isGeoTiff
              },
              {
                id: 'level_3_learned_ndsm' as CalibrationLevel,
                title: 'Level 3: Learned nDSM + DTM',
                desc: 'Decoupled bare-earth terrain DTM and high-res structural height.',
                badge: 'RDAH-Net',
                disabled: !isGeoTiff
              }
            ].map((tier) => (
              <div
                key={tier.id}
                onClick={() => !tier.disabled && setCalibrationLevel(tier.id)}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  calibrationLevel === tier.id 
                    ? 'bg-cyan-500/10 border-cyan-500/60 shadow-sm shadow-cyan-500/10 ring-1 ring-cyan-500/30' 
                    : tier.disabled 
                    ? 'opacity-40 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 cursor-not-allowed'
                    : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${calibrationLevel === tier.id ? 'text-cyan-700 dark:text-cyan-400' : 'text-slate-800 dark:text-slate-200'}`}>
                    {tier.title}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold">
                    {tier.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{tier.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Shader Modes Selection */}
        <div>
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2 font-mono">
            3. GPU Visualization Layer
          </label>
          <div className="grid grid-cols-2 gap-1.5 text-xs font-medium">
            {[
              { id: 'rgb' as ShaderMode, label: 'Optical RGB' },
              { id: 'colormap' as ShaderMode, label: 'Hypsometric' },
              { id: 'hillshade' as ShaderMode, label: 'Hillshade' },
              { id: 'uncertainty' as ShaderMode, label: 'Slope Hazard' },
              { id: 'wireframe' as ShaderMode, label: 'Wireframe' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setShaderMode(mode.id)}
                className={`py-1.5 px-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                  shaderMode === mode.id
                    ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 font-bold border-transparent shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{mode.label}</span>
                {shaderMode === mode.id && <Eye className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>

          {/* Colormap Palette Dropdown */}
          {shaderMode === 'colormap' && (
            <div className="mt-2.5 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500 dark:text-slate-400">Palette:</span>
              <select
                value={colormapPalette}
                onChange={(e) => setColormapPalette(e.target.value as ColormapPalette)}
                className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="turbo">Google Turbo (Spectral)</option>
                <option value="viridis">Viridis (Perceptual)</option>
                <option value="terrain">Geographic Terrain</option>
              </select>
            </div>
          )}
        </div>

        {/* 3D Visual Controls */}
        <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-mono">
            4. Terrain & Solar Lighting
          </label>

          {/* Vertical Exaggeration */}
          <div>
            <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
              <span className="flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Vertical Exaggeration:</span>
              </span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">{verticalExaggeration.toFixed(1)}x</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="4.0" 
              step="0.1" 
              value={verticalExaggeration}
              onChange={(e) => setVerticalExaggeration(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
            />
          </div>

          {/* Sun Lighting Angles (for Analytical Hillshade) */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-mono">
              <span className="flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Sun Azimuth:</span>
              </span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">{sunAzimuthDeg}°</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="360" 
              step="5" 
              value={sunAzimuthDeg}
              onChange={(e) => setSunAngles(parseFloat(e.target.value), sunElevationDeg)}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
            />

            <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 font-mono pt-1">
              <span className="flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Sun Elevation:</span>
              </span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">{sunElevationDeg}°</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="90" 
              step="2" 
              value={sunElevationDeg}
              onChange={(e) => setSunAngles(sunAzimuthDeg, parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
            />
          </div>

          {/* Contour Interval Slider */}
          <div>
            <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
              <span>Contour Step:</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">{contourInterval} m</span>
            </div>
            <input 
              type="range" 
              min="5" 
              max="50" 
              step="5" 
              value={contourInterval}
              onChange={(e) => setContourInterval(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
            />
          </div>

          {/* Slope Hazard Threshold */}
          <div>
            <div className="flex justify-between text-xs text-slate-700 dark:text-slate-300 mb-1.5 font-mono">
              <span>Slope Hazard Cutoff:</span>
              <span className="text-rose-600 dark:text-rose-400 font-bold">&gt; {slopeThresholdDeg}°</span>
            </div>
            <input 
              type="range" 
              min="15" 
              max="45" 
              step="1" 
              value={slopeThresholdDeg}
              onChange={(e) => setSlopeThresholdDeg(parseInt(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
            />
          </div>
        </div>

        {/* 4. Disaster Intelligence & Scenario Simulation */}
        <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-mono">
              4. Disaster Simulation
            </label>
            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold">
              Rapid Response
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-xs font-medium">
            {[
              { id: 'none', label: 'Off', icon: Activity },
              { id: 'flood', label: 'Flood Inundation', icon: Waves },
              { id: 'landslide', label: 'Landslide Runout', icon: AlertTriangle },
            ].map((sc) => {
              const Icon = sc.icon;
              const isActive = activeScenario === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => setActiveScenario(sc.id as any)}
                  className={`py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    isActive
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-300 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[10px] text-center leading-tight">{sc.label}</span>
                </button>
              );
            })}
          </div>

          {activeScenario === 'flood' && sceneData && (
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-2">
              <div className="flex justify-between text-xs text-cyan-800 dark:text-cyan-300 font-mono">
                <span className="flex items-center gap-1">
                  <Waves className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Flood Stage Level:</span>
                </span>
                <span className="font-bold">{floodLevel.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min={sceneData.minElevation}
                max={sceneData.maxElevation}
                step={(sceneData.maxElevation - sceneData.minElevation) / 100}
                value={floodLevel}
                onChange={(e) => setFloodLevel(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-cyan-200 dark:bg-cyan-950 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">
                <span>Min: {sceneData.minElevation.toFixed(0)}m</span>
                <span>Max: {sceneData.maxElevation.toFixed(0)}m</span>
              </div>
            </div>
          )}

          {activeScenario === 'landslide' && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] leading-snug flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>
                Visualizing active debris runout corridors for slopes exceeding {slopeThresholdDeg}°. High-risk infrastructure highlighted with warning stripes.
              </span>
            </div>
          )}
        </div>

        {/* Export Center */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-mono">
            5. Defense Assets & Export
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportGlb}
              disabled={isExportingGlb}
              className="py-2 px-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingGlb ? 'Packing...' : 'Export GLB'}</span>
            </button>

            <button
              onClick={handleExportGeoTiff}
              className="py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>GeoTIFF DSM</span>
            </button>
          </div>
        </div>

      </div>
    </aside>
  );
};
