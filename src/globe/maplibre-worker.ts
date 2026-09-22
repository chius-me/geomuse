import * as maplibregl from "maplibre-gl";

export const mapLibreWorkerUrl =
  "/vendor/maplibre-gl-worker.mjs";

let hasConfiguredWorker = false;

export function ensureMapLibreWorker() {
  if (hasConfiguredWorker) {
    return;
  }

  maplibregl.setWorkerUrl(mapLibreWorkerUrl);
  hasConfiguredWorker = true;
}
