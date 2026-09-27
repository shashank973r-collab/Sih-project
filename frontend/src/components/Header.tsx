import React from 'react';
import { 
  Globe2, 
  Layers, 
  Navigation, 
  Activity, 
  BarChart3, 
  Settings2,
  AlertTriangle,
  Compass,
  HelpCircle,
  Target,
  Sun,
  Moon
} from 'lucide-react';
import { useDepthWizardStore } from '../store/useDepthWizardStore';
import { PresetAOI } from '../utils/terrainGenerator';

export const Header: React.FC = () => {
  const { 
    theme,
    toggleTheme,
    sceneData, 
    selectedAoi,
    setSelectedAoi,
    cameraMode, 
    setCameraMode,
    fps, 
    leftPanelOpen, 
    setLeftPanelOpen,
    rightDrawerOpen,
    setRightDrawerOpen,
    activeTool,
    setActiveTool,
    setHelpModalOpen,
    gcps,
    validationReport
  } = useDepthWizardStore();

  const isMetric = sceneData?.isMetric ?? false;

  return (
    <header className="h-14 border-b transition-colors duration-300 px-4 flex items-center justify-between z-30 select-none bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-md border-slate-200/80 dark:border-white/10 shadow-sm dark:shadow-none">
      {/* Left: Branding & Tagline */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className={`p-2 rounded-xl transition-all ${
            leftPanelOpen 
              ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30' 
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
          title="Toggle Control Panel"
        >
          <Settings2 className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-600 to-blue-700 flex items-center justify-center shadow-md shadow-cyan-500/20 ring-1 ring-white/20">
            <Globe2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-sm text-slate-900 dark:text-white">
                DEPTH<span className="text-cyan-600 dark:text-cyan-400">WIZARD</span>
              </span>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-semibold tracking-wider">
                ISRO PS-26175
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 tracking-tight font-medium">Single-View Height Estimation & 3D Terrain Analysis</p>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden lg:block" />

        {/* Demo AOI Selector Dropdown */}
        <div className="hidden lg:flex items-center gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">AOI Preset:</span>
          <select
            value={selectedAoi}
            onChange={(e) => setSelectedAoi(e.target.value as PresetAOI)}
            className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:border-cyan-500/60 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium cursor-pointer transition-colors"
          >
            <option value="dehradun">Dehradun / Foothills (Hilly / High-Relief)</option>
            <option value="ahmedabad">Ahmedabad Urban Center (Built Environment)</option>
            <option value="mumbai">Mumbai Coastal Basin (Estuary / Lowland)</option>
          </select>
        </div>
      </div>

      {/* Middle: Mission Telemetry & Mode Badges */}
      <div className="hidden xl:flex items-center gap-2 font-mono text-xs">
        {/* Metric vs Relative Mode indicator */}
        <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-medium transition-all ${
          isMetric 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400' 
            : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
        }`}>
          {isMetric ? <Compass className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />}
          <span>{isMetric ? 'METRIC VALIDATED (m)' : 'RELATIVE rDSM [0-1]'}</span>
        </div>

        {/* CRS */}
        <div className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
          <span className="text-slate-400 dark:text-slate-500">CRS:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{sceneData?.metadata.crs.split(' ')[0] || 'Local Grid'}</span>
        </div>
      </div>

      {/* Right: Camera Switcher & Action Modals */}
      <div className="flex items-center gap-2">
        {/* GCP Indicator Button */}
        <button
          onClick={() => setRightDrawerOpen(true)}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-colors"
        >
          <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>GCPs</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono border border-emerald-500/20 font-bold">
            {gcps.length}
          </span>
        </button>

        {/* Accuracy Button */}
        <button
          onClick={() => setRightDrawerOpen(true)}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-colors"
        >
          <BarChart3 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Accuracy</span>
          <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-[10px] font-mono border border-cyan-500/20 font-bold">
            RMSE {validationReport.overall_rmse.toFixed(1)}m
          </span>
        </button>

        {/* Tool selectors */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTool(activeTool === 'probe' ? 'none' : 'probe')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTool === 'probe' 
                ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Probe</span>
          </button>

          <button
            onClick={() => setActiveTool(activeTool === 'profile' ? 'none' : 'profile')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTool === 'profile' 
                ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>
        </div>

        {/* Camera mode switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setCameraMode('orbit')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              cameraMode === 'orbit' 
                ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Orbit</span>
          </button>

          <button
            onClick={() => setCameraMode('drone')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              cameraMode === 'drone' 
                ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Drone</span>
          </button>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          title={`Switch to ${theme === 'light' ? 'Aerospace Dark' : 'Laboratory Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* FPS counter */}
        <div className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-bold hidden lg:block">
          {fps} FPS
        </div>

        {/* Help button */}
        <button
          onClick={() => setHelpModalOpen(true)}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Evaluation & Defense Guide"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
