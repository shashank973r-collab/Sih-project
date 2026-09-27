import React, { useState, useRef, useEffect } from 'react';
import {
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
  Moon,
  MoreVertical,
  X
} from 'lucide-react';
import { useDepthWizardStore } from '../store/useDepthWizardStore';
import { PresetAOI } from '../utils/terrainGenerator';
import logoUrl from '../logo.svg';

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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileMenuOpen]);

  const isMetric = sceneData?.isMetric ?? false;

  return (
    <header className="h-14 border-b transition-colors duration-300 px-3 sm:px-4 flex items-center justify-between z-30 select-none bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-md border-slate-200/80 dark:border-white/10 shadow-sm dark:shadow-none relative">
      {/* Left: Branding & Tagline */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          className={`p-2 rounded-xl transition-all ${
            leftPanelOpen 
              ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30' 
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
          }`}
          title="Toggle Mission Control Panel"
          aria-label="Toggle Mission Control Panel"
        >
          <Settings2 className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <img src={logoUrl} alt="DepthWizard logo" className="w-8 h-8 rounded-xl shrink-0 object-contain" />
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-extrabold tracking-tight text-xs sm:text-sm text-slate-900 dark:text-white">
                DEPTH<span className="text-cyan-600 dark:text-cyan-400">WIZARD</span>
              </span>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-semibold tracking-wider hidden md:inline">
                ISRO PS-26175
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 tracking-tight font-medium hidden xl:block">
              Single-View Height Estimation & 3D Terrain Analysis
            </p>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden lg:block" />

        {/* Demo AOI Selector Dropdown (Desktop) */}
        <div className="hidden lg:flex items-center gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">AOI:</span>
          <select
            value={selectedAoi}
            onChange={(e) => setSelectedAoi(e.target.value as PresetAOI)}
            className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:border-cyan-500/60 rounded-lg px-2.5 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium cursor-pointer transition-colors max-w-[150px] truncate"
          >
            <option value="dehradun">Dehradun / Foothills (Hilly / High-Relief)</option>
            <option value="ahmedabad">Ahmedabad Urban Center (Built Environment)</option>
            <option value="mumbai">Mumbai Coastal Basin (Estuary / Lowland)</option>
          </select>
        </div>
      </div>

      {/* Middle: Mission Telemetry & Mode Badges (Desktop XL+) */}
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
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* GCP Indicator Button (Desktop/Tablet) */}
        <button
          onClick={() => setRightDrawerOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-colors"
          title="View Ground Control Points"
        >
          <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden lg:inline">GCPs</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono border border-emerald-500/20 font-bold">
            {gcps.length}
          </span>
        </button>

        {/* Accuracy Button (Desktop/Tablet) */}
        <button
          onClick={() => setRightDrawerOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 transition-colors"
          title="View Accuracy Telemetry Report"
        >
          <BarChart3 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span className="hidden lg:inline">Accuracy</span>
          <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-[10px] font-mono border border-cyan-500/20 font-bold">
            RMSE {validationReport.overall_rmse.toFixed(1)}m
          </span>
        </button>

        {/* Tool selectors (Probe & Profile) */}
        <div className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-900/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTool(activeTool === 'probe' ? 'none' : 'probe')}
            className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all ${
              activeTool === 'probe' 
                ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Height Probe Tool"
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Probe</span>
          </button>

          <button
            onClick={() => setActiveTool(activeTool === 'profile' ? 'none' : 'profile')}
            className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all ${
              activeTool === 'profile' 
                ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Elevation Profile Transect Tool"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Profile</span>
          </button>
        </div>

        {/* Camera mode switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setCameraMode('orbit')}
            className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all ${
              cameraMode === 'orbit' 
                ? 'bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Orbit Inspection Camera"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Orbit</span>
          </button>

          <button
            onClick={() => setCameraMode('drone')}
            className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-all ${
              cameraMode === 'drone' 
                ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Drone Flythrough Camera"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Drone</span>
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

        {/* FPS counter (Desktop) */}
        <div className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-cyan-600 dark:text-cyan-400 font-bold hidden 2xl:block">
          {fps} FPS
        </div>

        {/* Help button (Desktop) */}
        <button
          onClick={() => setHelpModalOpen(true)}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition hidden sm:block"
          title="Evaluation & Defense Guide"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Mobile/Tablet Overflow Menu Button */}
        <div className="relative lg:hidden" ref={menuRef}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-lg border transition-colors ${
              mobileMenuOpen 
                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-600 dark:text-cyan-400' 
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
            }`}
            title="More Options"
            aria-label="More Options"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
          </button>

          {/* Mobile Dropdown Menu Card */}
          {mobileMenuOpen && (
            <div className="absolute right-0 top-12 w-64 p-3 rounded-2xl bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl z-50 text-xs space-y-3 font-sans animate-in fade-in zoom-in-95 duration-150">
              {/* AOI Preset Selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1">
                  Area of Interest (AOI):
                </label>
                <select
                  value={selectedAoi}
                  onChange={(e) => {
                    setSelectedAoi(e.target.value as PresetAOI);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium"
                >
                  <option value="dehradun">Dehradun / Foothills</option>
                  <option value="ahmedabad">Ahmedabad Urban Center</option>
                  <option value="mumbai">Mumbai Coastal Basin</option>
                </select>
              </div>

              {/* Status Badges */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800 font-mono text-[11px]">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Elevation Tier:</span>
                  <span className={`font-bold ${isMetric ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {isMetric ? 'Metric Validated' : 'Relative [0-1]'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Raster CRS:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{sceneData?.metadata.crs.split(' ')[0] || 'Local Grid'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span>Engine FPS:</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">{fps} FPS</span>
                </div>
              </div>

              {/* Analysis Tools (Probe & Profile) - hidden below sm on the main bar */}
              <div className="sm:hidden flex items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => {
                    setActiveTool(activeTool === 'probe' ? 'none' : 'probe');
                    setMobileMenuOpen(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-semibold transition ${
                    activeTool === 'probe'
                      ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Probe</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTool(activeTool === 'profile' ? 'none' : 'profile');
                    setMobileMenuOpen(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl text-xs font-semibold transition ${
                    activeTool === 'profile'
                      ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Profile</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => {
                    setRightDrawerOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium transition"
                >
                  <span className="flex items-center gap-2">
                    <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>GCP Registry</span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold">
                    {gcps.length} Active
                  </span>
                </button>

                <button
                  onClick={() => {
                    setRightDrawerOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium transition"
                >
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <span>Accuracy Report</span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-bold">
                    RMSE {validationReport.overall_rmse.toFixed(1)}m
                  </span>
                </button>

                <button
                  onClick={() => {
                    setHelpModalOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium transition"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span>Defense & Evaluation Guide</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
