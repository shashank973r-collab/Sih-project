import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Palette, 
  Sun, 
  AlertCircle, 
  Grid3X3, 
  RotateCcw,
  Camera,
  X,
  Info
} from 'lucide-react';
import { useDepthWizardStore } from '../../store/useDepthWizardStore';
import { ShaderMode } from '../../types/elevation';

export const ViewportOverlay: React.FC<{ onResetView: () => void }> = ({ onResetView }) => {
  const { 
    shaderMode, 
    setShaderMode,
    cameraMode,
    activeTool,
    sceneData,
    profileDrawerOpen,
    leftPanelOpen
  } = useDepthWizardStore();

  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );
  const [instructionsManualOpen, setInstructionsManualOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // The Left Panel (w-80, 320px) eats into the canvas; judge "wide enough" against
  // the space actually left for the canvas, not the raw window width.
  const canvasWidth = viewportWidth - (leftPanelOpen ? 320 : 0);
  const isCanvasWide = canvasWidth >= 1024;

  // Auto-collapse the instructions HUD when the canvas is narrow; a manual tap
  // always wins over the auto rule until the user toggles it again.
  const instructionsOpen = instructionsManualOpen ?? isCanvasWide;

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
      <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 sm:gap-1.5 p-1 rounded-2xl transition-colors duration-300 bg-white/95 dark:bg-[#070b14]/90 backdrop-blur-md border border-slate-200 dark:border-white/10 shadow-xl select-none max-w-[95vw]">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setShaderMode(m.id)}
            title={m.label}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-semibold transition-all ${
              shaderMode === m.id
                ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            {m.icon}
            <span className={isCanvasWide ? 'inline' : 'hidden'}>{m.label}</span>
          </button>
        ))}

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 sm:mx-1" />

        <button
          onClick={onResetView}
          title="Reset Camera View"
          className="p-1 sm:p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Instructions HUD (Collapsible) */}
      {instructionsOpen ? (
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-10 p-3 rounded-2xl transition-colors duration-300 bg-white/95 dark:bg-[#070b14]/90 backdrop-blur-md border border-slate-200 dark:border-white/10 text-[11px] font-mono text-slate-600 dark:text-slate-400 shadow-md max-w-[260px] animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-2 text-slate-900 dark:text-slate-200 font-bold mb-1.5 pb-1 border-b border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>{cameraMode === 'drone' ? 'Drone Flythrough' : 'Orbit Inspection'}</span>
            </div>
            <button
              onClick={() => setInstructionsManualOpen(false)}
              className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
              title="Minimize instructions"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {cameraMode === 'drone' ? (
            <div className="space-y-0.5 text-[10px]">
              <p className="text-cyan-700 dark:text-cyan-300 font-bold">Click canvas to lock flight pointer</p>
              <p>W / S - Forward / Back</p>
              <p>A / D - Strafe Left / Right</p>
              <p>Space - Ascend | Shift - Descend</p>
              <p>Esc - Unlock mouse pointer</p>
            </div>
          ) : (
            <div className="space-y-0.5 text-[10px]">
              <p>Left Click + Drag: Orbit view</p>
              <p>Right Click + Drag: Pan terrain</p>
              <p>Scroll: Zoom in / out</p>
              {activeTool === 'probe' && <p className="text-cyan-700 dark:text-cyan-400 font-bold mt-1">● Click terrain to probe elevation</p>}
              {activeTool === 'profile' && <p className="text-cyan-700 dark:text-cyan-400 font-bold mt-1">● Click 2 points to cut transect</p>}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => setInstructionsManualOpen(true)}
          className="absolute top-3 sm:top-4 left-3 sm:left-4 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/90 dark:bg-[#070b14]/85 backdrop-blur-md border border-slate-200 dark:border-white/10 text-[11px] font-mono text-slate-700 dark:text-slate-300 shadow-md hover:bg-slate-100 dark:hover:bg-slate-800 transition pointer-events-auto"
          title="Open Navigation Controls Guide"
        >
          <Info className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span className="hidden sm:inline font-semibold">Controls</span>
        </button>
      )}

      {/* Warning banner if in relative mode */}
      {!isMetric && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-10 px-3 sm:px-4 py-1.5 rounded-full bg-amber-500/10 dark:bg-amber-950/90 border border-amber-500/40 text-amber-800 dark:text-amber-200 text-xs font-mono flex items-center gap-2 shadow-lg backdrop-blur-md pointer-events-none transition-all duration-300 ${
          profileDrawerOpen ? 'bottom-56' : cameraMode === 'drone' ? 'bottom-20 sm:bottom-24' : 'bottom-4'
        }`}>
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="hidden sm:inline">Scale-free input: Elevation displayed as normalized relative height [0-100%].</span>
          <span className="sm:hidden text-[10px]">Relative scale [0-100%]</span>
        </div>
      )}
    </>
  );
};
