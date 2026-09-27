import React from 'react';
import { X, Globe2, ShieldCheck, Layers, Compass } from 'lucide-react';
import { useDepthWizardStore } from '../store/useDepthWizardStore';

export const HelpModal: React.FC = () => {
  const { helpModalOpen, setHelpModalOpen } = useDepthWizardStore();

  if (!helpModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl rounded-3xl transition-colors duration-300 bg-white dark:bg-[#070b14] border border-slate-200 dark:border-white/10 shadow-2xl p-6 text-slate-800 dark:text-slate-200 font-sans space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Globe2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">DepthWizard Defense & Evaluation Guide</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">ISRO Smart India Hackathon 2026 — Problem Statement 26175</p>
            </div>
          </div>
          <button 
            onClick={() => setHelpModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          <div>
            <h3 className="text-cyan-700 dark:text-cyan-400 font-bold uppercase tracking-wider text-[11px] mb-1 flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Core Scientific Problem & Defensible Engineering</span>
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-normal">
              Generic monocular foundation models (like zero-shot Depth Anything V2) predict <em>relative camera depth</em>, not metric elevation. In remote sensing, pretending relative depth is a metric DSM via a simple global affine scaling fails catastrophically on slopes and varied terrain. DepthWizard solves this by anchoring broad topography to low-frequency DEMs (SRTM 30m) and isolating above-ground structures via <strong className="text-slate-900 dark:text-slate-200 font-mono">DSM = DTM + nDSM</strong>.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5">
                <Compass className="w-4 h-4" /> 3D Flythrough Controls
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                Switch to <strong>Drone Fly</strong> mode in the top-right. Click canvas to lock flight controls. Use <strong>W/A/S/D</strong> to glide, <strong>Space/Shift</strong> to climb/descend, and monitor the real-time speed & altitude HUD.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4" /> Height & Slope Probing
              </span>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                Click <strong>Height Probe</strong> and click any building or terrain point to inspect absolute elevation ($m$), local slope ($^\circ$), and WGS84 coordinates. Click <strong>Profile</strong> to generate a 2D cross-section transect.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              onClick={() => setHelpModalOpen(false)}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all"
            >
              Continue Inspection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
