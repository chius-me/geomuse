import maplibregl from "maplibre-gl/dist/maplibre-gl-csp.js";

export const mapLibreWorkerUrl =
  "/vendor/maplibre-gl-csp-worker.js";

let hasConfiguredWorker = false;

export function ensureMapLibreWorker() {
  if (hasConfiguredWorker) {
    return;
  }

  maplibregl.setWorkerUrl(mapLibreWorkerUrl);
  hasConfiguredWorker = true;
}
