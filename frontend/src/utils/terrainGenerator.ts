import * as THREE from 'three';
import { ElevationSceneData, GeoTIFFMetadata } from '../types/elevation';

// Procedural pseudo-random 2D Perlin-like noise generator
class FastNoise {
  private perm: number[] = [];

  constructor(seed = 1337) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let j = 0;
    for (let i = 0; i < 256; i++) {
      seed = (seed * 16807) % 2147483647;
      j = (j + p[i] + (seed % 256)) % 256;
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number) {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];

    const x1 = this.lerp(u, this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf));
    const x2 = this.lerp(u, this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1));

    return this.lerp(v, x1, x2);
  }

  fbm(x: number, y: number, octaves = 5, persistence = 0.5): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    return total / maxValue;
  }
}

export type PresetAOI = 'dehradun' | 'ahmedabad' | 'mumbai';

export function generateSyntheticRemoteSensingScene(
  width = 256,
  height = 256,
  isMetric = true,
  aoiPreset: PresetAOI = 'dehradun'
): ElevationSceneData {
  const seed = aoiPreset === 'dehradun' ? 42 : aoiPreset === 'ahmedabad' ? 99 : 777;
  const noise = new FastNoise(seed);
  const totalPixels = width * height;

  const elevationGrid = new Float32Array(totalPixels);
  const dtmGrid = new Float32Array(totalPixels);
  const ndsmGrid = new Float32Array(totalPixels);
  const uncertaintyGrid = new Float32Array(totalPixels);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  let minElev = Infinity;
  let maxElev = -Infinity;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const nx = x / width;
      const ny = y / height;

      let dtmVal = 0;
      let ndsmVal = 0;
      let r = 80, g = 110, b = 70;

      if (aoiPreset === 'dehradun') {
        // High-relief mountain terrain
        const ridge1 = Math.sin(nx * 5.0 + ny * 6.0) * 120.0;
        const ridge2 = Math.cos(nx * 8.0 - ny * 5.0) * 150.0;
        const fbm = noise.fbm(nx * 4, ny * 4, 5, 0.55);
        const valley = Math.exp(-Math.pow(nx - 0.45, 2) / 0.03) * -160.0;
        dtmVal = isMetric ? 680 + ridge1 + ridge2 + fbm * 90 + valley : 0.3 + fbm * 0.4;

        // Tree clumps in forest areas
        const treeNoise = noise.noise2D(nx * 30, ny * 30);
        if (treeNoise > 0.15) {
          ndsmVal = isMetric ? 8 + treeNoise * 15 : 0.15;
          r = 35 + treeNoise * 15;
          g = 95 + treeNoise * 35;
          b = 45;
        } else {
          r = 90 + Math.floor(fbm * 30);
          g = 125 + Math.floor(fbm * 20);
          b = 75;
        }

        // Mountain river gorge
        if (Math.abs(nx - (0.45 + noise.noise2D(ny * 3, 0) * 0.05)) < 0.04) {
          ndsmVal = 0;
          r = 40; g = 85; b = 135;
        }
      } else if (aoiPreset === 'ahmedabad') {
        // Flat urban alluvial plain with city blocks
        const base = isMetric ? 52.0 + nx * 5.0 : 0.1;
        dtmVal = base;

        // Sabarmati river
        const riverDist = Math.abs(nx - (0.35 + Math.sin(ny * 6) * 0.04));
        if (riverDist < 0.05) {
          r = 30; g = 75; b = 120;
          ndsmVal = 0;
        } else {
          // City blocks & buildings
          const blockX = Math.floor(nx * 32);
          const blockY = Math.floor(ny * 32);
          const isRoad = (blockX % 3 === 0) || (blockY % 3 === 0);

          if (!isRoad) {
            const bSeed = (blockX * 1337 + blockY * 71) % 100;
            ndsmVal = isMetric ? 12 + (bSeed % 35) : 0.2 + (bSeed / 100) * 0.5;
            if (bSeed % 3 === 0) { r = 185; g = 90; b = 80; }
            else if (bSeed % 3 === 1) { r = 195; g = 200; b = 210; }
            else { r = 120; g = 125; b = 135; }
          } else {
            r = 65; g = 68; b = 72;
            ndsmVal = 0;
          }
        }
      } else {
        // Mumbai coastal & flash flood basin
        const sea = nx < 0.28;
        const hill = nx > 0.65 ? Math.pow((nx - 0.65) / 0.35, 2) * 95.0 : 0;
        dtmVal = isMetric ? (sea ? 1.5 : 4.0 + hill) : 0.1;

        if (sea) {
          r = 25; g = 65; b = 110;
          ndsmVal = 0;
        } else if (nx >= 0.28 && nx < 0.42) {
          // Mangrove swamp
          r = 45; g = 85; b = 55;
          ndsmVal = isMetric ? 4 : 0.05;
        } else {
          // Built-up coastal city
          const bld = (Math.floor(nx * 26) % 3 !== 0) && (Math.floor(ny * 26) % 3 !== 0);
          ndsmVal = bld ? (isMetric ? 18.0 : 0.25) : 0;
          r = bld ? 175 : 90;
          g = bld ? 175 : 95;
          b = bld ? 185 : 100;
        }
      }

      ndsmGrid[idx] = ndsmVal;
      dtmGrid[idx] = dtmVal;
      const totalElev = dtmVal + ndsmVal;
      elevationGrid[idx] = totalElev;

      if (totalElev < minElev) minElev = totalElev;
      if (totalElev > maxElev) maxElev = totalElev;

      uncertaintyGrid[idx] = isMetric ? 0.4 + (ndsmVal > 0 ? 1.5 : 0.3) + Math.random() * 0.4 : 0.1;

      const pIdx = idx * 4;
      data[pIdx] = Math.min(255, Math.max(0, r));
      data[pIdx + 1] = Math.min(255, Math.max(0, g));
      data[pIdx + 2] = Math.min(255, Math.max(0, b));
      data[pIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const presetsMetadata: Record<PresetAOI, GeoTIFFMetadata> = {
    dehradun: {
      isGeoreferenced: isMetric,
      filename: 'ISRO_DEHRADUN_HIMALAYAN_FOOTHILLS.tif',
      crs: 'EPSG:32644 (WGS 84 / UTM Zone 44N)',
      epsg: 32644,
      bounds: { west: 78.01, south: 30.28, east: 78.08, north: 30.35 },
      gsd_m: 0.5,
      dimensions: { width, height },
      datum: 'WGS84 / EGM96 Geoid'
    },
    ahmedabad: {
      isGeoreferenced: isMetric,
      filename: 'ISRO_CARTOSAT_AHMEDABAD_URBAN.tif',
      crs: 'EPSG:32643 (WGS 84 / UTM Zone 43N)',
      epsg: 32643,
      bounds: { west: 72.53, south: 23.01, east: 72.60, north: 23.07 },
      gsd_m: 0.5,
      dimensions: { width, height },
      datum: 'WGS84 / EGM96 Geoid'
    },
    mumbai: {
      isGeoreferenced: isMetric,
      filename: 'ISRO_MUMBAI_COASTAL_BASIN.tif',
      crs: 'EPSG:32643 (WGS 84 / UTM Zone 43N)',
      epsg: 32643,
      bounds: { west: 72.82, south: 18.92, east: 72.95, north: 19.12 },
      gsd_m: 0.8,
      dimensions: { width, height },
      datum: 'WGS84 / EGM96 Geoid'
    }
  };

  return {
    width,
    height,
    elevationGrid,
    dtmGrid,
    ndsmGrid,
    uncertaintyGrid,
    minElevation: minElev,
    maxElevation: maxElev,
    isMetric,
    metadata: presetsMetadata[aoiPreset],
    textureCanvas: canvas,
    sourceImageSrc: canvas.toDataURL('image/jpeg', 0.9)
  };
}

export function buildTerrainGeometry(
  sceneData: ElevationSceneData,
  verticalExaggeration = 1.0
): THREE.PlaneGeometry {
  const { width, height, elevationGrid, minElevation, maxElevation, isMetric } = sceneData;

  const geometry = new THREE.PlaneGeometry(120, 120, width - 1, height - 1);
  geometry.rotateX(-Math.PI / 2);

  const posAttr = geometry.attributes.position;
  const count = posAttr.count;

  const elevRange = maxElevation - minElevation || 1;
  const targetScale = isMetric ? 24.0 : 16.0;

  for (let i = 0; i < count; i++) {
    const elev = elevationGrid[i];
    const normalizedY = ((elev - minElevation) / elevRange) * targetScale * verticalExaggeration;
    posAttr.setY(i, normalizedY);
  }

  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();

  return geometry;
}
