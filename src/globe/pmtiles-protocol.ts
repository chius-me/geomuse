import maplibregl from "maplibre-gl/dist/maplibre-gl-csp.js";
import { Protocol } from "pmtiles";

let protocol: Protocol | null = null;

export function ensurePMTilesProtocol() {
  if (protocol) {
    return;
  }

  protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
}
