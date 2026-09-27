import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Header } from './components/Header';
import { LeftPanel } from './components/LeftPanel';
import { RightAnalytics } from './components/RightAnalytics';
import { ThreeCanvas } from './components/viewport/ThreeCanvas';
import { ViewportOverlay } from './components/viewport/ViewportOverlay';
import { ColorbarLegend } from './components/viewport/ColorbarLegend';
import { DroneControlsHUD } from './components/viewport/DroneControlsHUD';
import { HeightProbeModal } from './components/HeightProbeModal';
import { ElevationProfileDrawer } from './components/ElevationProfileDrawer';
import { HelpModal } from './components/HelpModal';
import { useDepthWizardStore } from './store/useDepthWizardStore';

export function App() {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const [resetViewTrigger, setResetViewTrigger] = useState(0);
  const { 
    theme, 
    leftPanelOpen, 
    setLeftPanelOpen, 
    rightDrawerOpen, 
    setRightDrawerOpen 
  } = useDepthWizardStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const [droneTelemetry, setDroneTelemetry] = useState<{
    pos: { x: number; y: number; z: number };
    speed: number;
    heading: number;
  }>({
    pos: { x: 0, y: 15, z: 0 },
    speed: 0,
    heading: 0,
  });

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 dark:bg-[#060913] dark:text-slate-100 select-none font-sans transition-colors duration-300">
      {/* Top Application Bar */}
      <Header />

      {/* Main Workspace */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Mobile/Tablet Backdrop Scrim for Drawers */}
        {(leftPanelOpen || rightDrawerOpen) && (
          <div 
            onClick={() => {
              setLeftPanelOpen(false);
              setRightDrawerOpen(false);
            }}
            className="fixed inset-0 top-14 bg-slate-950/60 backdrop-blur-sm z-30 lg:hidden transition-opacity cursor-pointer"
            aria-label="Close Drawer Overlay"
          />
        )}

        {/* Left Side: Control & Calibration Ingestion */}
        <LeftPanel meshRef={meshRef} />

        {/* Center: Interactive Three.js 3D Viewport */}
        <main className="flex-1 relative h-full w-full bg-slate-200/50 dark:bg-[#070b14] overflow-hidden">
          {/* Three.js Rendering Engine */}
          <ThreeCanvas 
            meshRef={meshRef} 
            setDroneTelemetry={setDroneTelemetry}
            resetViewTrigger={resetViewTrigger}
          />

          {/* Overlays & HUD */}
          <ViewportOverlay onResetView={() => setResetViewTrigger(prev => prev + 1)} />
          <DroneControlsHUD 
            dronePos={droneTelemetry.pos}
            droneSpeed={droneTelemetry.speed}
            droneHeading={droneTelemetry.heading}
          />
          <ColorbarLegend />
          <HeightProbeModal />
          <ElevationProfileDrawer />
        </main>

        {/* Right Side: Validation & Stratified Biome Analytics */}
        <RightAnalytics />
      </div>

      {/* Global Modals */}
      <HelpModal />
    </div>
  );
}

export default App;
