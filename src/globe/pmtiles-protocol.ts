import * as maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";

let protocol: Protocol | null = null;

export function ensurePMTilesProtocol() {
  if (protocol) {
    return;
  }

  protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
}
