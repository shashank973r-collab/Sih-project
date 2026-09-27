import React from 'react';
import { MapPin, X } from 'lucide-react';
import { useDepthWizardStore } from '../store/useDepthWizardStore';

export const HeightProbeModal: React.FC = () => {
  const { heightProbe, setHeightProbe } = useDepthWizardStore();

  if (!heightProbe) return null;

  return (
    <div className="absolute top-16 sm:top-20 right-3 sm:right-6 z-20 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl transition-colors duration-300 bg-white/95 dark:bg-[#070b14]/95 border border-slate-200 dark:border-cyan-500/40 p-3 sm:p-4 shadow-2xl backdrop-blur-md font-mono text-xs text-slate-700 dark:text-slate-300 select-none">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 font-bold">
          <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400 animate-bounce" />
          <span>SURFACE HEIGHT PROBE</span>
        </div>
        <button 
          onClick={() => setHeightProbe(null)}
          className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        {/* Elevation Readout */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5 uppercase">
            {heightProbe.isMetric ? 'Absolute Elevation (DSM)' : 'Relative Surface Height'}
          </span>
          <div className="text-xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
            <span className="text-cyan-600 dark:text-cyan-400">{heightProbe.elevation.toFixed(1)}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">{heightProbe.isMetric ? 'm MSL' : '%'}</span>
          </div>
          {heightProbe.uncertainty_m && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5 font-semibold">
              Confidence: ±{heightProbe.uncertainty_m.toFixed(2)} m (1-sigma)
            </span>
          )}
        </div>

        {/* Slope & Aspect */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60">
            <span className="text-slate-400 block text-[10px]">LOCAL SLOPE</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{heightProbe.slopeDeg.toFixed(1)}°</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60">
            <span className="text-slate-400 block text-[10px]">ASPECT</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{heightProbe.aspectDeg.toFixed(0)}°</span>
          </div>
        </div>

        {/* Geospatial Coords */}
        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 text-[10px] space-y-0.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Raster Pixel:</span>
            <span className="text-slate-700 dark:text-slate-200 font-bold">X: {heightProbe.pixelX}, Y: {heightProbe.pixelY}</span>
          </div>
          {heightProbe.coords && (
            <div className="flex justify-between">
              <span className="text-slate-400">WGS84:</span>
              <span className="text-cyan-700 dark:text-cyan-400 font-bold">{heightProbe.coords.lat.toFixed(4)}°N, {heightProbe.coords.lon.toFixed(4)}°E</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
