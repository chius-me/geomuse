declare module "maplibre-gl/dist/maplibre-gl-csp.js" {
  import type * as MapLibreGL from "maplibre-gl";

  const maplibregl: typeof MapLibreGL;

  export default maplibregl;
}
