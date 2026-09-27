import * as THREE from 'three';

export interface TerrainUniforms {
  [uniform: string]: THREE.IUniform;
  uTexture: { value: THREE.Texture | null };
  uElevationMin: { value: number };
  uElevationMax: { value: number };
  uMode: { value: number }; // 0: RGB, 1: Colormap, 2: Hillshade, 3: Slope Hazard, 4: Uncertainty, 5: Contours
  uSunDir: { value: THREE.Vector3 };
  uContourInterval: { value: number };
  uSlopeThresholdRad: { value: number };
  uPalette: { value: number }; // 0: Turbo, 1: Viridis, 2: Terrain
  uShowContours: { value: boolean };
  uActiveScenario: { value: number }; // 0: None, 1: Flood, 2: Landslide
  uFloodLevel: { value: number };
  uTime: { value: number };
}

export function createTerrainShaderMaterial(
  rgbTexture: THREE.Texture | null,
  minElev: number,
  maxElev: number
): THREE.ShaderMaterial {
  const uniforms: TerrainUniforms = {
    uTexture: { value: rgbTexture },
    uElevationMin: { value: minElev },
    uElevationMax: { value: maxElev },
    uMode: { value: 0 },
    uSunDir: { value: new THREE.Vector3(0.5, 0.8, 0.5).normalize() },
    uContourInterval: { value: 10.0 },
    uSlopeThresholdRad: { value: (30.0 * Math.PI) / 180.0 },
    uPalette: { value: 0 },
    uShowContours: { value: false },
    uActiveScenario: { value: 0 },
    uFloodLevel: { value: minElev },
    uTime: { value: 0.0 },
  };

  const vertexShader = /* glsl */ `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying float vElev;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPosition.xyz;
      vElev = position.y; // elevation in local space
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `;

  const fragmentShader = /* glsl */ `
    uniform sampler2D uTexture;
    uniform float uElevationMin;
    uniform float uElevationMax;
    uniform int uMode; // 0: RGB, 1: Colormap, 2: Hillshade, 3: Slope Hazard, 4: Uncertainty, 5: Contours
    uniform vec3 uSunDir;
    uniform float uContourInterval;
    uniform float uSlopeThresholdRad;
    uniform int uPalette;
    uniform bool uShowContours;
    uniform int uActiveScenario; // 0: None, 1: Flood, 2: Landslide
    uniform float uFloodLevel;
    uniform float uTime;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying float vElev;

    // Fast GPU Turbo colormap polynomial
    vec3 colormapTurbo(float t) {
      t = clamp(t, 0.0, 1.0);
      const vec4 kRedVec4 = vec4(0.13572138, 4.61539260, -42.66032258, 132.13108234);
      const vec4 kGreenVec4 = vec4(0.09140261, 2.19418839, 4.84296658, -14.18503333);
      const vec4 kBlueVec4 = vec4(0.10667330, 12.64194608, -60.58204836, 110.36276771);
      const vec2 kRedVec2 = vec2(-152.94239396, 59.28637943);
      const vec2 kGreenVec2 = vec2(4.27729857, 2.82956604);
      const vec2 kBlueVec2 = vec2(-89.90310912, 27.34824973);

      vec4 v4 = vec4(1.0, t, t * t, t * t * t);
      vec2 v2 = v4.zw * v4.z;

      return vec3(
        dot(v4, kRedVec4) + dot(v2, kRedVec2),
        dot(v4, kGreenVec4) + dot(v2, kGreenVec2),
        dot(v4, kBlueVec4) + dot(v2, kBlueVec2)
      );
    }

    // Viridis colormap approximation
    vec3 colormapViridis(float t) {
      t = clamp(t, 0.0, 1.0);
      vec3 c0 = vec3(0.267, 0.004, 0.329);
      vec3 c1 = vec3(0.190, 0.407, 0.556);
      vec3 c2 = vec3(0.208, 0.718, 0.472);
      vec3 c3 = vec3(0.993, 0.906, 0.143);
      if (t < 0.33) return mix(c0, c1, t / 0.33);
      if (t < 0.66) return mix(c1, c2, (t - 0.33) / 0.33);
      return mix(c2, c3, (t - 0.66) / 0.34);
    }

    // Terrain elevation palette (Forest Green -> Khaki -> Rock Gray -> Snow White)
    vec3 colormapTerrain(float t) {
      t = clamp(t, 0.0, 1.0);
      vec3 water = vec3(0.12, 0.35, 0.55);
      vec3 valley = vec3(0.22, 0.55, 0.28);
      vec3 midland = vec3(0.78, 0.72, 0.42);
      vec3 mountain = vec3(0.52, 0.42, 0.35);
      vec3 snow = vec3(0.95, 0.96, 0.98);

      if (t < 0.25) return mix(valley, midland, t / 0.25);
      if (t < 0.65) return mix(midland, mountain, (t - 0.25) / 0.40);
      return mix(mountain, snow, (t - 0.65) / 0.35);
    }

    void main() {
      // 1. Analytical Hillshade
      vec3 N = normalize(vNormal);
      vec3 L = normalize(uSunDir);
      float lambert = max(dot(N, L), 0.0);
      float hillshade = 0.22 + 0.78 * lambert; // Ambient + Direct

      // 2. Normalized elevation [0.0, 1.0]
      float elevRange = max(uElevationMax - uElevationMin, 0.001);
      float tElev = clamp((vElev - uElevationMin) / elevRange, 0.0, 1.0);

      // 3. Base Color depending on Mode
      vec3 baseColor = vec3(1.0);
      vec4 texColor = texture2D(uTexture, vUv);

      if (uMode == 0) {
        // RGB Optical Drape + subtle hillshade modulation
        baseColor = texColor.rgb * (0.45 + 0.55 * hillshade);
      } else if (uMode == 1) {
        // Hypsometric Colormap with Hillshade Relief
        vec3 cmap = (uPalette == 1) ? colormapViridis(tElev) : 
                    (uPalette == 2) ? colormapTerrain(tElev) : 
                    colormapTurbo(tElev);
        baseColor = cmap * (0.35 + 0.65 * hillshade);
      } else if (uMode == 2) {
        // Pure Analytical Hillshade (Monochrome Swiss Cartographic)
        baseColor = vec3(hillshade);
      } else if (uMode == 3) {
        // Slope Hazard Map
        float slopeRad = acos(clamp(abs(N.y), 0.0, 1.0));
        if (slopeRad > uSlopeThresholdRad) {
          float severity = clamp((slopeRad - uSlopeThresholdRad) / 0.35, 0.0, 1.0);
          baseColor = mix(vec3(0.95, 0.65, 0.1), vec3(0.92, 0.15, 0.15), severity);
        } else {
          baseColor = vec3(0.2, 0.75, 0.45) * hillshade;
        }
      } else if (uMode == 4) {
        // Uncertainty Heatmap (Blue = Confident, Red = High Variance)
        baseColor = colormapTurbo(1.0 - tElev) * (0.5 + 0.5 * hillshade);
      }

      // 4. Procedural Antialiased Contour Lines
      if (uShowContours || uMode == 5) {
        float f = abs(fract(vElev / uContourInterval) - 0.5);
        float df = fwidth(vElev / uContourInterval);
        float contour = smoothstep(0.0, df * 1.5, f);
        baseColor = mix(vec3(0.05, 0.05, 0.08), baseColor, contour);
      }

      // 5. Disaster Simulation (Flood Inundation & Landslide Hazard)
      if (uActiveScenario == 1) {
        // Flood Inundation Simulation
        if (vElev <= uFloodLevel) {
          float depth = max(0.0, uFloodLevel - vElev);
          float normDepth = clamp(depth / 12.0, 0.0, 1.0);
          float wave = sin(vWorldPos.x * 0.5 + uTime * 2.5) * cos(vWorldPos.z * 0.5 + uTime * 2.0) * 0.06;
          vec3 deepWater = vec3(0.03, 0.22, 0.45);
          vec3 shallowWater = vec3(0.12, 0.65, 0.82);
          vec3 waterCol = mix(shallowWater, deepWater, normDepth) + vec3(wave);
          baseColor = mix(baseColor * 0.35, waterCol, 0.85);
        } else if (vElev <= uFloodLevel + 1.2) {
          baseColor *= 0.65; // Wet muddy shore margin
        }
      } else if (uActiveScenario == 2) {
        // Landslide Runout Hazard Zones (slopes > threshold)
        float slopeRad = acos(clamp(abs(N.y), 0.0, 1.0));
        if (slopeRad > uSlopeThresholdRad) {
          float stripe = sin((vWorldPos.x + vWorldPos.z) * 1.2 - uTime * 3.0);
          vec3 warnCol = stripe > 0.0 ? vec3(0.95, 0.15, 0.15) : vec3(0.98, 0.82, 0.08);
          baseColor = mix(baseColor, warnCol, 0.72);
        }
      }

      gl_FragColor = vec4(baseColor, 1.0);
    }
  `;

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    wireframe: false
  });

  return mat;
}
