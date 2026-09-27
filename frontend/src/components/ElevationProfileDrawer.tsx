import React, { useMemo } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { useDepthWizardStore } from '../store/useDepthWizardStore';

export const ElevationProfileDrawer: React.FC = () => {
  const { 
    elevationProfile, 
    profileDrawerOpen, 
    clearProfile,
    sceneData 
  } = useDepthWizardStore();

  if (!profileDrawerOpen || !elevationProfile || elevationProfile.length < 2) {
    return null;
  }

  const isMetric = sceneData?.isMetric ?? false;
  const unit = isMetric ? 'm' : '%';

  // Compute profile statistics
  const stats = useMemo(() => {
    let minE = Infinity, maxE = -Infinity, totalDist = 0, sumSlope = 0;
    for (const p of elevationProfile) {
      if (p.elevation < minE) minE = p.elevation;
      if (p.elevation > maxE) maxE = p.elevation;
      sumSlope += p.slope_deg;
    }
    totalDist = elevationProfile[elevationProfile.length - 1].distance_m;
    return {
      minElev: minE,
      maxElev: maxE,
      relief: maxE - minE,
      totalDist: totalDist,
      avgSlope: sumSlope / elevationProfile.length
    };
  }, [elevationProfile]);

  // Generate SVG path for cross-section
  const svgWidth = 840;
  const svgHeight = 160;
  const padX = 45;
  const padY = 24;
  const chartW = svgWidth - padX * 2;
  const chartH = svgHeight - padY * 2;

  const points = useMemo(() => {
    const range = stats.maxElev - stats.minElev || 1;
    return elevationProfile.map((p) => {
      const x = padX + (p.distance_m / stats.totalDist) * chartW;
      const y = padY + chartH - ((p.elevation - stats.minElev) / range) * chartH;
      const yDtm = padY + chartH - ((p.dtm - stats.minElev) / range) * chartH;
      return { x, y, yDtm, d: p.distance_m, e: p.elevation };
    });
  }, [elevationProfile, stats]);

  const dsmPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const dtmPath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yDtm.toFixed(1)}`).join(' ');
  const areaPath = `${dsmPath} L ${points[points.length - 1].x.toFixed(1)} ${padY + chartH} L ${points[0].x.toFixed(1)} ${padY + chartH} Z`;

  return (
    <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 w-[95%] sm:w-[92%] max-w-4xl rounded-2xl transition-colors duration-300 bg-white/95 dark:bg-[#070b14]/95 border border-slate-200 dark:border-cyan-500/30 p-3 sm:p-4 shadow-2xl backdrop-blur-md text-xs font-mono select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 font-bold text-[11px] sm:text-xs">
            <TrendingUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="truncate">ELEVATION PROFILE TRANSECT</span>
          </div>
          <button 
            onClick={clearProfile}
            className="sm:hidden p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Close Profile Transect"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-slate-600 dark:text-slate-400 text-[10px] sm:text-[11px]">
            <span>Dist: <strong className="text-slate-900 dark:text-white font-bold">{stats.totalDist.toFixed(1)}m</strong></span>
            <span>Relief: <strong className="text-cyan-700 dark:text-cyan-400 font-bold">{stats.relief.toFixed(1)}{unit}</strong></span>
            <span>Avg Slope: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{stats.avgSlope.toFixed(1)}°</strong></span>
          </div>
          <button 
            onClick={clearProfile}
            className="hidden sm:block p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Close Profile Transect"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Elevation Chart */}
      <div className="w-full overflow-hidden bg-slate-50 dark:bg-slate-950/70 rounded-xl border border-slate-200 dark:border-slate-800/80 p-1.5 sm:p-2">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-28 sm:h-36">
          <defs>
            <linearGradient id="profileGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padX} y1={padY} x2={padX + chartW} y2={padY} stroke="#94a3b8" strokeDasharray="3 3" opacity="0.3" />
          <line x1={padX} y1={padY + chartH / 2} x2={padX + chartW} y2={padY + chartH / 2} stroke="#94a3b8" strokeDasharray="3 3" opacity="0.3" />
          <line x1={padX} y1={padY + chartH} x2={padX + chartW} y2={padY + chartH} stroke="#64748b" opacity="0.4" />

          {/* Shaded Area */}
          <path d={areaPath} fill="url(#profileGradient)" />

          {/* DTM Bare Earth Line (dashed slate) */}
          <path d={dtmPath} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 4" />

          {/* DSM Surface Line (cyan) */}
          <path d={dsmPath} fill="none" stroke="#06b6d4" strokeWidth="2.5" />

          {/* Key sample vertices */}
          {points.map((p, i) => (
            (i === 0 || i === points.length - 1 || i % Math.floor(points.length / 6) === 0) && (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
            )
          ))}

          {/* Y-axis labels */}
          <text x={padX - 8} y={padY + 4} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">{stats.maxElev.toFixed(0)}{unit}</text>
          <text x={padX - 8} y={padY + chartH / 2 + 3} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">{((stats.minElev + stats.maxElev)/2).toFixed(0)}{unit}</text>
          <text x={padX - 8} y={padY + chartH} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">{stats.minElev.toFixed(0)}{unit}</text>

          {/* X-axis labels */}
          <text x={padX} y={svgHeight - 4} fill="#64748b" fontSize="9" fontFamily="JetBrains Mono">0m</text>
          <text x={padX + chartW} y={svgHeight - 4} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">{stats.totalDist.toFixed(0)}m</text>
        </svg>
      </div>

      <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-500 inline-block" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">DSM (Surface Model)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-slate-500 inline-block" />
            <span>DTM (Bare Earth)</span>
          </div>
        </div>
        <span>* Sub-pixel bilinear sampling directly along 3D transect vector</span>
      </div>
    </div>
  );
};
