/**
 * DepthWizard FastAPI Backend Service Client
 * Direct fallback to client-side procedural generator if offline
 */

export interface PredictResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  is_metric: boolean;
  min_elevation: number;
  max_elevation: number;
  crs: string;
  gsd_m: number;
  glb_url?: string;
  geotiff_url?: string;
  ndsm_geotiff_url?: string;
  metrics?: {
    rmse: number;
    mae: number;
    correlation: number;
  };
}

// In production (HF Spaces / any deployment) the backend serves on the same origin.
// During local development, Vite runs on :8089 while the API runs on :8000.
const isDev = typeof window !== 'undefined' && window.location.port === '8089';
const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ??
  (isDev ? 'http://localhost:8000/api/v1' : '/api/v1');

export class DepthWizardAPI {
  /**
   * Uploads an optical RGB image and requests elevation estimation
   */
  static async estimateElevation(
    file: File,
    calibrationMode: string,
    gcpFile?: File
  ): Promise<PredictResponse> {
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('calibration_mode', calibrationMode);
      if (gcpFile) {
        formData.append('gcp_file', gcpFile);
      }

      const res = await fetch(`${API_BASE_URL}/elevation/estimate`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      console.warn('Backend API unavailable. Operating in Standalone Edge Mode.', err);
      // Fallback response for offline demo
      return {
        job_id: 'mock-job-' + Date.now(),
        status: 'completed',
        is_metric: file.name.endsWith('.tif') || file.name.endsWith('.tiff'),
        min_elevation: 812.5,
        max_elevation: 885.2,
        crs: 'EPSG:32643 (WGS 84 / UTM 43N)',
        gsd_m: 0.5,
      };
    }
  }

  /**
   * Probes point elevation, slope, and aspect
   */
  static async probePoint(jobId: string, x: number, y: number) {
    try {
      const res = await fetch(`${API_BASE_URL}/elevation/probe?job_id=${jobId}&x=${x}&y=${y}`);
      if (res.ok) return await res.json();
    } catch (e) {
      // Fallback
    }
    return null;
  }
}
