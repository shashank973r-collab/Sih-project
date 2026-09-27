import React from 'react';
import { 
  Eye, 
  Palette, 
  Sun, 
  AlertCircle, 
  Grid3X3, 
  RotateCcw,
  Camera,
  Layers
} from 'lucide-react';
import { useDepthWizardStore } from '../../store/useDepthWizardStore';
import { ShaderMode } from '../../types/elevation';

export const ViewportOverlay: React.FC<{ onResetView: () => void }> = ({ onResetView }) => {
  const { 
    shaderMode, 
    setShaderMode,
    cameraMode,
    activeTool,
    sceneData
  } = useDepthWizardStore();

  const isMetric = sceneData?.isMetric ?? false;

  const modes: Array<{ id: ShaderMode; label: string; icon: React.ReactNode }> = [
    { id: 'rgb', label: 'True Color RGB', icon: <Eye className="w-3.5 h-3.5" /> },
    { id: 'colormap', label: 'Hypsometric', icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'hillshade', label: 'Hillshade Relief', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'uncertainty', label: 'Slope Hazard', icon: <AlertCircle className="w-3.5 h-3.5" /> },
    { id: 'wireframe', label: 'Wireframe', icon: <Grid3X3 className="w-3.5 h-3.5" /> },
  ];

  return (
    <>
      {/* Top Viewport Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 p-1 rounded-2xl transition-colors duration-300 bg-white/95 dark:bg-[#070b14]/90 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-xl select-none">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setShaderMode(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              shaderMode === m.id
                ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            {m.icon}
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        ))}

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        <button
          onClick={onResetView}
          title="Reset Camera View"
          className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Instructions HUD */}
      <div className="absolute top-4 left-4 z-10 p-3 rounded-2xl transition-colors duration-300 bg-white/90 dark:bg-[#070b14]/85 backdrop-blur-md border border-slate-200 dark:border-white/10 text-[11px] font-mono text-slate-600 dark:text-slate-400 pointer-events-none shadow-md">
        <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-200 font-bold mb-1">
          <Camera className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>{cameraMode === 'drone' ? 'Drone Flythrough' : 'Orbit Inspection'}</span>
        </div>
        {cameraMode === 'drone' ? (
          <div className="space-y-0.5">
            <p className="text-cyan-700 dark:text-cyan-300 font-bold">Click canvas to lock flight pointer</p>
            <p>W / S - Forward / Back | A / D - Strafe</p>
            <p>Space - Ascend | Shift - Descend</p>
            <p>Esc - Unlock mouse pointer</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            <p>Left Click + Drag: Orbit rotation</p>
            <p>Right Click + Drag: Pan terrain</p>
            <p>Scroll: Zoom in / out</p>
            {activeTool === 'probe' && <p className="text-cyan-700 dark:text-cyan-400 font-bold mt-1">● Click terrain to probe elevation & slope</p>}
            {activeTool === 'profile' && <p className="text-cyan-700 dark:text-cyan-400 font-bold mt-1">● Click 2 points to cut elevation cross-section</p>}
          </div>
        )}
      </div>

      {/* Warning banner if in relative mode */}
      {!isMetric && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-950/90 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs font-mono flex items-center gap-2 shadow-lg backdrop-blur-md pointer-events-none">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Scale-free input: Elevation displayed as normalized relative height [0-100%].</span>
        </div>
      )}
    </>
  );
};
