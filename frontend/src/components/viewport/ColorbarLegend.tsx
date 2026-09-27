import React from 'react';
import { useDepthWizardStore } from '../../store/useDepthWizardStore';

export const ColorbarLegend: React.FC = () => {
  const { 
    sceneData, 
    shaderMode, 
    colormapPalette,
    profileDrawerOpen,
    cameraMode
  } = useDepthWizardStore();

  if (!sceneData || (shaderMode !== 'colormap' && shaderMode !== 'uncertainty')) {
    return null;
  }

  const isMetric = sceneData.isMetric;
  const isUncertainty = shaderMode === 'uncertainty';
  const minVal = isUncertainty ? 0.2 : (isMetric ? sceneData.minElevation : 0);
  const maxVal = isUncertainty ? 2.8 : (isMetric ? sceneData.maxElevation : 100);
  const unit = isUncertainty ? 'm std' : (isMetric ? 'm MSL' : '%');

  let gradientStyle = 'linear-gradient(to right, #30123b, #4675ed, #1bcfd4, #61fc4c, #f3c63a, #d93806, #7a0402)';
  if (isUncertainty) {
    gradientStyle = 'linear-gradient(to right, #10b981, #f59e0b, #ef4444)';
  } else if (colormapPalette === 'viridis') {
    gradientStyle = 'linear-gradient(to right, #440154, #3b528b, #21908c, #5dc963, #fde725)';
  } else if (colormapPalette === 'terrain') {
    gradientStyle = 'linear-gradient(to right, #1f5a34, #388e3c, #c5b358, #8d6e63, #ffffff)';
  }

  const bottomPositionClass = profileDrawerOpen 
    ? 'bottom-60 sm:bottom-64' 
    : (cameraMode === 'drone' ? 'bottom-24 sm:bottom-28' : 'bottom-4 sm:bottom-6');

  return (
    <div className={`absolute ${bottomPositionClass} right-3 sm:right-6 z-10 p-2.5 sm:p-3 rounded-2xl transition-all duration-300 bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl font-mono text-[9px] sm:text-[10px] w-44 sm:w-52 select-none`}>
      <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
        <span>{isUncertainty ? 'Uncertainty Map' : 'Elevation (DSM)'}</span>
        <span className="text-cyan-700 dark:text-cyan-400 font-bold">[{unit}]</span>
      </div>

      {/* Gradient Bar */}
      <div 
        className="h-3.5 w-full rounded-lg border border-slate-300 dark:border-slate-700/80 mb-1.5 shadow-inner"
        style={{ background: gradientStyle }}
      />

      {/* Axis Ticks */}
      <div className="flex justify-between text-slate-500 dark:text-slate-400 font-semibold">
        <span>{minVal.toFixed(0)}</span>
        <span>{((minVal + maxVal) / 2).toFixed(0)}</span>
        <span>{maxVal.toFixed(0)}</span>
      </div>
    </div>
  );
};
