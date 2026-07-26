import type { StyleSpecification } from "maplibre-gl";
import {
  createPmtilesTileTemplate,
  type ResolvedBasemapProvider,
} from "./basemap-provider.ts";
import { createGraticule } from "./graticule.ts";
import { globeLayerRegistry } from "./layer-registry.ts";

export function createGlobeStyle(
  basemapProvider?: ResolvedBasemapProvider,
): StyleSpecification {
  const sources: StyleSpecification["sources"] = {
    graticule: {
      type: "geojson",
      data: createGraticule(),
    },
  };

  const layers: StyleSpecification["layers"] = [
    {
      id: globeLayerRegistry.ocean.id,
      type: "background",
      paint: {
        "background-color": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          "#061720",
          3,
          "#09232e",
          6,
          "#0b2a36",
        ],
      },
    },
  ];

  if (basemapProvider) {
    sources.basemap = {
      type: "vector",
      tiles: [createPmtilesTileTemplate(basemapProvider)],
      minzoom: 0,
      maxzoom: 6,
      attribution: basemapProvider.attribution,
    };

    layers.push({
      id: globeLayerRegistry.land.id,
      type: "fill",
      source: "basemap",
      "source-layer": globeLayerRegistry.land.sourceLayer,
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          "#315d52",
          2.5,
          "#356359",
          4.5,
          "#3b6a5f",
          6,
          "#426f63",
        ],
        "fill-outline-color": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0,
          "rgba(184, 225, 214, 0.22)",
          2,
          "rgba(184, 225, 214, 0.34)",
          6,
          "rgba(184, 225, 214, 0.58)",
        ],
      },
    });

    layers.push({
      id: globeLayerRegistry.lakes.id,
      type: "fill",
      source: "basemap",
      "source-layer": globeLayerRegistry.lakes.sourceLayer,
      minzoom: 1,
      paint: {
        "fill-color": [
          "interpolate",
          ["linear"],
          ["zoom"],
          1,
          "#0a2935",
          4,
          "#0d3340",
          6,
          "#103b49",
        ],
        "fill-outline-color": [
          "interpolate",
          ["linear"],
          ["zoom"],
          1,
          "rgba(111, 185, 191, 0.20)",
          6,
          "rgba(124, 207, 210, 0.44)",
        ],
      },
    });

    layers.push({
      id: globeLayerRegistry.rivers.id,
      type: "line",
      source: "basemap",
      "source-layer": globeLayerRegistry.rivers.sourceLayer,
      minzoom: 2,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#67b9bd",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          0.35,
          4,
          0.62,
          6,
          1,
        ],
        "line-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          0.38,
          4,
          0.56,
          6,
          0.72,
        ],
      },
    });

    layers.push({
      id: globeLayerRegistry.boundaries.id,
      type: "line",
      source: "basemap",
      "source-layer":
        globeLayerRegistry.boundaries.sourceLayer,
      minzoom: 2.5,
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#c0d0cc",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2.5,
          0.32,
          4,
          0.46,
          6,
          0.7,
        ],
        "line-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2.5,
          0.16,
          4,
          0.27,
          6,
          0.42,
        ],
      },
    });
  }

  layers.push({
    id: globeLayerRegistry.graticule.id,
    type: "line",
    source: "graticule",
    paint: {
      "line-color": "rgba(154, 213, 215, 0.20)",
      "line-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        0.35,
        2,
        0.5,
        5,
        0.72,
      ],
      "line-opacity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        0.78,
        2,
        0.58,
        4,
        0.34,
        6,
        0.18,
      ],
    },
  });

  return {
    version: 8,
    name: "GeoMuse Globe",
    projection: {
      type: "globe",
    },
    sky: {
      "sky-color": "#01050a",
      "sky-horizon-blend": 0.08,
      "horizon-color": "#123845",
      "horizon-fog-blend": 0,
      "atmosphere-blend": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        0.78,
        3,
        0.42,
        6,
        0,
      ],
    },
    sources,
    layers,
  };
}
