/**
 * Colormap lookup functions (Turbo, Viridis, Terrain) to generate shader & 2D canvas textures
 */

export function turboColormap(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  const r = 0.1357 + t * (4.5974 - t * (42.681 - t * (152.58 - t * (221.38 - t * 110.22))));
  const g = 0.0914 + t * (2.1856 + t * (4.8052 - t * (14.095 - t * (4.2159 - t * 4.425))));
  const b = 0.1067 + t * (12.573 - t * (86.195 - t * (301.44 - t * (488.66 - t * 291.68))));
  return [
    Math.round(Math.max(0, Math.min(1, r)) * 255),
    Math.round(Math.max(0, Math.min(1, g)) * 255),
    Math.round(Math.max(0, Math.min(1, b)) * 255),
  ];
}

export function viridisColormap(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  const c0 = [68, 1, 84];
  const c1 = [59, 82, 139];
  const c2 = [33, 145, 140];
  const c3 = [94, 201, 98];
  const c4 = [253, 231, 37];

  let cStart, cEnd, localT;
  if (t < 0.25) {
    cStart = c0; cEnd = c1; localT = t / 0.25;
  } else if (t < 0.5) {
    cStart = c1; cEnd = c2; localT = (t - 0.25) / 0.25;
  } else if (t < 0.75) {
    cStart = c2; cEnd = c3; localT = (t - 0.5) / 0.25;
  } else {
    cStart = c3; cEnd = c4; localT = (t - 0.75) / 0.25;
  }

  return [
    Math.round(cStart[0] + (cEnd[0] - cStart[0]) * localT),
    Math.round(cStart[1] + (cEnd[1] - cStart[1]) * localT),
    Math.round(cStart[2] + (cEnd[2] - cStart[2]) * localT),
  ];
}

export function uncertaintyHeatmap(t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  // Cool green (high confidence/low uncertainty) -> Yellow -> Red (high uncertainty)
  if (t < 0.5) {
    const factor = t * 2;
    return [Math.round(40 + factor * 215), Math.round(180 + factor * 40), 50];
  } else {
    const factor = (t - 0.5) * 2;
    return [255, Math.round(220 * (1 - factor)), 40];
  }
}

/**
 * Creates dynamic 2D canvas texture representing elevation gradient
 */
export function generateElevationTexture(
  elevationGrid: Float32Array,
  width: number,
  height: number,
  minElev: number,
  maxElev: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  const range = maxElev - minElev || 1;

  for (let i = 0; i < elevationGrid.length; i++) {
    const t = (elevationGrid[i] - minElev) / range;
    const [r, g, b] = turboColormap(t);
    const pIdx = i * 4;
    data[pIdx] = r;
    data[pIdx + 1] = g;
    data[pIdx + 2] = b;
    data[pIdx + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Generates an uncertainty map texture
 */
export function generateUncertaintyTexture(
  uncertaintyGrid: Float32Array,
  width: number,
  height: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  let minU = Infinity, maxU = -Infinity;
  for (let i = 0; i < uncertaintyGrid.length; i++) {
    if (uncertaintyGrid[i] < minU) minU = uncertaintyGrid[i];
    if (uncertaintyGrid[i] > maxU) maxU = uncertaintyGrid[i];
  }
  const range = maxU - minU || 1;

  for (let i = 0; i < uncertaintyGrid.length; i++) {
    const t = (uncertaintyGrid[i] - minU) / range;
    const [r, g, b] = uncertaintyHeatmap(t);
    const pIdx = i * 4;
    data[pIdx] = r;
    data[pIdx + 1] = g;
    data[pIdx + 2] = b;
    data[pIdx + 3] = 230;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}
