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
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6">
      {/* Reticle / Artificial Horizon Crosshair in center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
        <Crosshair className="w-10 h-10 text-cyan-400/50 stroke-1" />
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 absolute" />
      </div>

      {/* Top Heading Compass Bar */}
      <div className="self-center flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-950/80 border border-cyan-500/30 font-mono text-xs text-cyan-300 backdrop-blur-md">
        <Compass className="w-4 h-4 text-cyan-400 animate-pulse" />
        <span>HDG: {droneHeading.toFixed(0)}°</span>
        <span className="text-slate-600">|</span>
        <span>LAT: 12.9754°N</span>
        <span className="text-slate-600">|</span>
        <span>LON: 77.6012°E</span>
      </div>

      {/* Bottom Telemetry Gauges */}
      <div className="flex justify-between items-end">
        {/* Speed */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs text-slate-300 backdrop-blur-md space-y-1">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Gauge className="w-4 h-4" />
            <span className="font-bold">GROUND SPEED</span>
          </div>
          <div className="text-lg font-bold text-white">
            {droneSpeed.toFixed(1)} <span className="text-xs text-slate-400 font-normal">m/s</span>
          </div>
        </div>

        {/* Altitude */}
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs text-slate-300 backdrop-blur-md space-y-1 text-right">
          <div className="flex items-center justify-end gap-1.5 text-emerald-400">
            <span className="font-bold">ALTITUDE (AGL)</span>
            <ArrowUp className="w-4 h-4" />
          </div>
          <div className="text-lg font-bold text-white">
            {(dronePos.y * 5).toFixed(1)} <span className="text-xs text-slate-400 font-normal">m</span>
          </div>
        </div>
      </div>
    </div>
  );
};
