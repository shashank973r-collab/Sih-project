import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { useDepthWizardStore } from '../../store/useDepthWizardStore';
import { buildTerrainGeometry } from '../../utils/terrainGenerator';
import { createTerrainShaderMaterial } from '../../utils/terrainShaders';
import { HeightProbeData, ElevationProfilePoint } from '../../types/elevation';

export const ThreeCanvas: React.FC<{
  meshRef: React.MutableRefObject<THREE.Mesh | null>;
  setDroneTelemetry: (data: { pos: { x: number; y: number; z: number }; speed: number; heading: number }) => void;
  resetViewTrigger: number;
}> = ({ meshRef, setDroneTelemetry, resetViewTrigger }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    theme,
    sceneData,
    shaderMode,
    cameraMode,
    verticalExaggeration,
    sunAzimuthDeg,
    sunElevationDeg,
    contourInterval,
    slopeThresholdDeg,
    colormapPalette,
    activeScenario,
    floodLevel,
    activeTool,
    setHeightProbe,
    addProfilePoint,
    profilePoints,
    setElevationProfile,
    setFps
  } = useDepthWizardStore();

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const pointerControlsRef = useRef<PointerLockControls | null>(null);
  const pinMarkerRef = useRef<THREE.Mesh | null>(null);
  const profileLineRef = useRef<THREE.Line | null>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const rgbTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // Drone flight physics
  const moveState = useRef({ forward: false, backward: false, left: false, right: false, up: false, down: false });
  const velocity = useRef(new THREE.Vector3());
  const prevTime = useRef(performance.now());

  // 1. Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    const isDark = theme === 'dark';
    const bgColor = isDark ? 0x060913 : 0xf1f5f9;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, isDark ? 0.0035 : 0.0025);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.5, 2000);
    camera.position.set(0, 68, 98);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.05;
    orbit.maxPolarAngle = Math.PI / 2 - 0.05;
    orbit.minDistance = 10;
    orbit.maxDistance = 450;
    orbit.target.set(0, 8, 0);
    orbitControlsRef.current = orbit;

    const pointer = new PointerLockControls(camera, renderer.domElement);
    pointerControlsRef.current = pointer;

    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.5 : 0.75);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.3);
    dirLight.position.set(60, 100, 60);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const gridColor1 = isDark ? 0x1e293b : 0xcbd5e1;
    const gridColor2 = isDark ? 0x0f172a : 0xe2e8f0;
    const grid = new THREE.GridHelper(260, 52, gridColor1, gridColor2);
    grid.position.y = -0.5;
    scene.add(grid);
    gridHelperRef.current = grid;

    // Needle marker for height probe
    const pinGroup = new THREE.Group();
    const pinGeo = new THREE.ConeGeometry(0.7, 2.8, 16);
    pinGeo.rotateX(Math.PI);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      roughness: 0.2,
      metalness: 0.8
    });
    const pinCone = new THREE.Mesh(pinGeo, pinMat);
    pinGroup.add(pinCone);
    pinGroup.visible = false;
    scene.add(pinGroup);
    pinMarkerRef.current = pinCone;

    // Animation Loop
    let frameCount = 0;
    let lastFpsTime = performance.now();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = performance.now();
      const delta = (time - prevTime.current) / 1000;
      prevTime.current = time;

      frameCount++;
      if (time - lastFpsTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastFpsTime = time;
      }

      if (pointer.isLocked) {
        const move = moveState.current;
        const speed = 40.0;
        velocity.current.x -= velocity.current.x * 10.0 * delta;
        velocity.current.z -= velocity.current.z * 10.0 * delta;
        velocity.current.y -= velocity.current.y * 10.0 * delta;

        const dir = new THREE.Vector3();
        if (move.forward) dir.z += 1;
        if (move.backward) dir.z -= 1;
        if (move.left) dir.x -= 1;
        if (move.right) dir.x += 1;
        dir.normalize();

        if (move.forward || move.backward) velocity.current.z -= dir.z * speed * delta;
        if (move.left || move.right) velocity.current.x += dir.x * speed * delta;
        if (move.up) velocity.current.y += speed * delta;
        if (move.down) velocity.current.y -= speed * delta;

        pointer.moveRight(-velocity.current.x);
        pointer.moveForward(-velocity.current.z);
        camera.position.y += velocity.current.y;

        if (camera.position.y < 3) camera.position.y = 3;

        const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
        let heading = -euler.y * (180 / Math.PI);
        if (heading < 0) heading += 360;

        setDroneTelemetry({
          pos: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
          speed: Math.sqrt(velocity.current.x ** 2 + velocity.current.z ** 2) * 50,
          heading
        });
      } else {
        orbit.update();
      }

      if (shaderMatRef.current) {
        shaderMatRef.current.uniforms.uTime.value = time * 0.001;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  // 2. Theme synchronization for background & fog
  useEffect(() => {
    if (!sceneRef.current) return;
    const isDark = theme === 'dark';
    const bgColor = isDark ? 0x060913 : 0xf1f5f9;
    sceneRef.current.background = new THREE.Color(bgColor);
    if (sceneRef.current.fog) {
      sceneRef.current.fog.color.setHex(bgColor);
    }
  }, [theme]);

  // 3. Reset view handler
  useEffect(() => {
    if (!cameraRef.current || !orbitControlsRef.current) return;
    cameraRef.current.position.set(0, 68, 98);
    orbitControlsRef.current.target.set(0, 8, 0);
    orbitControlsRef.current.update();
  }, [resetViewTrigger]);

  // 4. Drone keyboard listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': moveState.current.forward = true; break;
        case 'KeyS': moveState.current.backward = true; break;
        case 'KeyA': moveState.current.left = true; break;
        case 'KeyD': moveState.current.right = true; break;
        case 'Space': moveState.current.up = true; break;
        case 'ShiftLeft': moveState.current.down = true; break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': moveState.current.forward = false; break;
        case 'KeyS': moveState.current.backward = false; break;
        case 'KeyA': moveState.current.left = false; break;
        case 'KeyD': moveState.current.right = false; break;
        case 'Space': moveState.current.up = false; break;
        case 'ShiftLeft': moveState.current.down = false; break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // 5. Camera mode toggles
  useEffect(() => {
    if (cameraMode === 'drone') {
      orbitControlsRef.current!.enabled = false;
      const onClickCanvas = () => pointerControlsRef.current?.lock();
      const dom = rendererRef.current?.domElement;
      dom?.addEventListener('click', onClickCanvas);
      return () => dom?.removeEventListener('click', onClickCanvas);
    } else {
      if (pointerControlsRef.current?.isLocked) {
        pointerControlsRef.current.unlock();
      }
      orbitControlsRef.current!.enabled = true;
    }
  }, [cameraMode]);

  // 6. Build Terrain Mesh with Hardware GPU Shader Material
  useEffect(() => {
    if (!sceneRef.current || !sceneData) return;

    if (meshRef.current) {
      sceneRef.current.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      (meshRef.current.material as THREE.Material).dispose();
      meshRef.current = null;
    }

    const geometry = buildTerrainGeometry(sceneData, verticalExaggeration);

    const rgbTex = new THREE.CanvasTexture(sceneData.textureCanvas);
    rgbTex.wrapS = THREE.ClampToEdgeWrapping;
    rgbTex.wrapT = THREE.ClampToEdgeWrapping;
    rgbTextureRef.current = rgbTex;

    const shaderMaterial = createTerrainShaderMaterial(
      rgbTex,
      sceneData.minElevation,
      sceneData.maxElevation
    );
    shaderMatRef.current = shaderMaterial;

    const mesh = new THREE.Mesh(geometry, shaderMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    sceneRef.current.add(mesh);
    meshRef.current = mesh;

    updateShaderUniforms();
  }, [sceneData, verticalExaggeration]);

  // 7. Update Shader Uniforms in Real-time (0 ms CPU cost)
  const updateShaderUniforms = useCallback(() => {
    const mat = shaderMatRef.current;
    if (!mat) return;

    const modeMap: Record<string, number> = {
      rgb: 0,
      colormap: 1,
      hillshade: 2,
      uncertainty: 4,
      wireframe: 0
    };

    mat.uniforms.uMode.value = modeMap[shaderMode] ?? 0;
    mat.wireframe = shaderMode === 'wireframe';

    const radAz = (sunAzimuthDeg * Math.PI) / 180;
    const radEl = (sunElevationDeg * Math.PI) / 180;
    mat.uniforms.uSunDir.value.set(
      Math.cos(radEl) * Math.sin(radAz),
      Math.sin(radEl),
      Math.cos(radEl) * Math.cos(radAz)
    ).normalize();

    mat.uniforms.uContourInterval.value = contourInterval;
    mat.uniforms.uSlopeThresholdRad.value = (slopeThresholdDeg * Math.PI) / 180.0;
    mat.uniforms.uPalette.value = colormapPalette === 'viridis' ? 1 : colormapPalette === 'terrain' ? 2 : 0;
    mat.uniforms.uActiveScenario.value = activeScenario === 'flood' ? 1 : activeScenario === 'landslide' ? 2 : 0;
    mat.uniforms.uFloodLevel.value = floodLevel;
  }, [shaderMode, sunAzimuthDeg, sunElevationDeg, contourInterval, slopeThresholdDeg, colormapPalette, activeScenario, floodLevel]);

  useEffect(() => {
    updateShaderUniforms();
  }, [updateShaderUniforms]);

  // 8. Raycasting for Height Probe and Profile Transect
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (cameraMode === 'drone') return;
    if (activeTool === 'none') return;
    if (!meshRef.current || !cameraRef.current || !containerRef.current || !sceneData) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
    const intersects = raycaster.intersectObject(meshRef.current);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const uv = hit.uv!;
      const px = Math.min(sceneData.width - 1, Math.floor(uv.x * sceneData.width));
      const py = Math.min(sceneData.height - 1, Math.floor((1 - uv.y) * sceneData.height));
      const idx = py * sceneData.width + px;

      const elev = sceneData.elevationGrid[idx];
      const unc = sceneData.uncertaintyGrid[idx];

      const normal = hit.normal!;
      const slopeRad = Math.acos(Math.max(0, Math.min(1, normal.y)));
      const slopeDeg = (slopeRad * 180) / Math.PI;
      let aspectDeg = (Math.atan2(-normal.x, normal.z) * 180) / Math.PI;
      if (aspectDeg < 0) aspectDeg += 360;

      if (activeTool === 'probe') {
        if (pinMarkerRef.current) {
          pinMarkerRef.current.position.copy(hit.point);
          pinMarkerRef.current.position.y += 1.4;
          pinMarkerRef.current.visible = true;
        }

        const probeData: HeightProbeData = {
          pixelX: px,
          pixelY: py,
          worldX: hit.point.x,
          worldZ: hit.point.z,
          elevation: elev,
          isMetric: sceneData.isMetric,
          slopeDeg,
          aspectDeg,
          uncertainty_m: sceneData.isMetric ? unc : undefined,
          coords: sceneData.isMetric ? {
            lat: sceneData.metadata.bounds.south + (1 - uv.y) * (sceneData.metadata.bounds.north - sceneData.metadata.bounds.south),
            lon: sceneData.metadata.bounds.west + uv.x * (sceneData.metadata.bounds.east - sceneData.metadata.bounds.west),
          } : undefined
        };

        setHeightProbe(probeData);
      } else if (activeTool === 'profile') {
        addProfilePoint({ x: hit.point.x, z: hit.point.z });
      }
    }
  };

  // 9. Synchronized Elevation Profile Slicer
  useEffect(() => {
    if (!sceneRef.current || !sceneData || !meshRef.current) return;

    if (profileLineRef.current) {
      sceneRef.current.remove(profileLineRef.current);
      profileLineRef.current.geometry.dispose();
      (profileLineRef.current.material as THREE.Material).dispose();
      profileLineRef.current = null;
    }

    if (profilePoints.length < 2) return;

    const p1 = profilePoints[profilePoints.length - 2];
    const p2 = profilePoints[profilePoints.length - 1];
    const steps = 60;
    const sampledPoints: THREE.Vector3[] = [];
    const profileData: ElevationProfilePoint[] = [];

    const raycaster = new THREE.Raycaster();
    let cumulativeDist = 0;
    let prevSampleWorld: THREE.Vector3 | null = null;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const wx = p1.x + t * (p2.x - p1.x);
      const wz = p1.z + t * (p2.z - p1.z);

      raycaster.set(new THREE.Vector3(wx, 160, wz), new THREE.Vector3(0, -1, 0));
      const hits = raycaster.intersectObject(meshRef.current);

      if (hits.length > 0) {
        const hit = hits[0];
        sampledPoints.push(new THREE.Vector3(wx, hit.point.y + 0.4, wz));

        const uv = hit.uv!;
        const px = Math.min(sceneData.width - 1, Math.floor(uv.x * sceneData.width));
        const py = Math.min(sceneData.height - 1, Math.floor((1 - uv.y) * sceneData.height));
        const idx = py * sceneData.width + px;

        if (prevSampleWorld) {
          cumulativeDist += hit.point.distanceTo(prevSampleWorld);
        }
        prevSampleWorld = hit.point.clone();

        const slopeDeg = (Math.acos(Math.max(0, Math.min(1, hit.normal!.y))) * 180) / Math.PI;

        profileData.push({
          distance_m: cumulativeDist * 2.5,
          elevation: sceneData.elevationGrid[idx],
          dsm: sceneData.elevationGrid[idx],
          dtm: sceneData.dtmGrid[idx],
          ndsm: sceneData.ndsmGrid[idx],
          slope_deg: slopeDeg
        });
      }
    }

    const lineGeo = new THREE.BufferGeometry().setFromPoints(sampledPoints);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, linewidth: 4 });
    const lineMesh = new THREE.Line(lineGeo, lineMat);
    sceneRef.current.add(lineMesh);
    profileLineRef.current = lineMesh;

    setElevationProfile(profileData);
  }, [profilePoints, sceneData]);

  return (
    <div 
      ref={containerRef} 
      onPointerDown={handlePointerDown}
      className="w-full h-full relative cursor-crosshair overflow-hidden" 
    />
  );
};
