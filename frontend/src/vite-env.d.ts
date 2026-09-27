/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Override the backend API base URL. Defaults to relative /api/v1 in production
   * and http://localhost:8000/api/v1 in local development. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
