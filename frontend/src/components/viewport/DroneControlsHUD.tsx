import React, { useEffect, useState } from 'react';
import { Compass, Gauge, ArrowUp, Crosshair } from 'lucide-react';
import { useDepthWizardStore } from '../../store/useDepthWizardStore';

export const DroneControlsHUD: React.FC<{
  dronePos: { x: number; y: number; z: number };
  droneSpeed: number;
  droneHeading: number;
}> = ({ dronePos, droneSpeed, droneHeading }) => {
  const { cameraMode, sceneData } = useDepthWizardStore();

  if (cameraMode !== 'drone') return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 sm:p-6">
      {/* Reticle / Artificial Horizon Crosshair in center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
        <Crosshair className="w-8 sm:w-10 h-8 sm:h-10 text-cyan-400/50 stroke-1" />
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 absolute" />
      </div>

      {/* Top Heading Compass Bar - offset below top toolbar */}
      <div className="self-center mt-12 sm:mt-14 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-slate-950/85 border border-cyan-500/30 font-mono text-[11px] sm:text-xs text-cyan-300 backdrop-blur-md shadow-lg pointer-events-auto">
        <Compass className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-cyan-400 animate-pulse shrink-0" />
        <span>HDG: {droneHeading.toFixed(0)}°</span>
        <span className="text-slate-600">|</span>
        <span className="hidden sm:inline">LAT: 12.9754°N | LON: 77.6012°E</span>
        <span className="sm:hidden">12.98°N, 77.60°E</span>
      </div>

      {/* Bottom Telemetry Gauges */}
      <div className="flex justify-between items-end gap-2">
        {/* Speed */}
        <div className="p-2 sm:p-3 rounded-xl bg-slate-950/85 border border-slate-800 font-mono text-[10px] sm:text-xs text-slate-300 backdrop-blur-md space-y-0.5 sm:space-y-1 shadow-lg pointer-events-auto">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
            <Gauge className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <span className="text-[9px] sm:text-xs">GROUND SPEED</span>
          </div>
          <div className="text-sm sm:text-lg font-bold text-white">
            {droneSpeed.toFixed(1)} <span className="text-[10px] sm:text-xs text-slate-400 font-normal">m/s</span>
          </div>
        </div>

        {/* Altitude */}
        <div className="p-2 sm:p-3 rounded-xl bg-slate-950/85 border border-slate-800 font-mono text-[10px] sm:text-xs text-slate-300 backdrop-blur-md space-y-0.5 sm:space-y-1 text-right shadow-lg pointer-events-auto">
          <div className="flex items-center justify-end gap-1.5 text-emerald-400 font-bold">
            <span className="text-[9px] sm:text-xs">ALTITUDE (AGL)</span>
            <ArrowUp className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          </div>
          <div className="text-sm sm:text-lg font-bold text-white">
            {(dronePos.y * 5).toFixed(1)} <span className="text-[10px] sm:text-xs text-slate-400 font-normal">m</span>
          </div>
        </div>
      </div>
    </div>
  );
};
