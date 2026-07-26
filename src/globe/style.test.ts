import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LayerSpecification } from "maplibre-gl";
import { basemapContract } from "./basemap-contract.ts";
import {
  createBasemapProvider,
  resolveBasemapProvider,
} from "./basemap-provider.ts";
import { createGlobeStyle } from "./style.ts";

const testBasemapProvider = resolveBasemapProvider(
  createBasemapProvider("/data/natural-earth.pmtiles"),
  "http://localhost",
);

assert.ok(testBasemapProvider);

function findLayer(
  layers: LayerSpecification[],
  id: string,
): LayerSpecification {
  const layer = layers.find((candidate) => candidate.id === id);

  assert.ok(layer, `Expected layer "${id}" to exist`);
  return layer;
}

describe("globe style", () => {
  it("keeps the initial rendering pipeline within its source and layer budget", () => {
    const style = createGlobeStyle(testBasemapProvider);

    assert.equal(Object.keys(style.sources).length, 2);
    assert.equal(style.layers.length, 6);
    assert.equal(style.projection?.type, "globe");
    assert.ok(style.sky);
  });

  it("implements every contracted basemap source layer exactly once", () => {
    const style = createGlobeStyle(testBasemapProvider);
    const sourceLayerIds = style.layers.flatMap((layer) =>
      "source-layer" in layer &&
      typeof layer["source-layer"] === "string"
        ? [layer["source-layer"]]
        : [],
    );

    assert.deepEqual(
      sourceLayerIds,
      basemapContract.layers.map(({ id }) => id),
    );
  });

  it("uses zoom-driven land and graticule detail without extra layers", () => {
    const style = createGlobeStyle(testBasemapProvider);
    const land = findLayer(style.layers, "land");
    const graticule = findLayer(style.layers, "graticule");

    assert.equal(land.type, "fill");
    assert.deepEqual(land.paint?.["fill-color"], [
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
    ]);
    assert.deepEqual(land.paint?.["fill-outline-color"], [
      "interpolate",
      ["linear"],
      ["zoom"],
      0,
      "rgba(184, 225, 214, 0.22)",
      2,
      "rgba(184, 225, 214, 0.34)",
      6,
      "rgba(184, 225, 214, 0.58)",
    ]);

    assert.equal(graticule.type, "line");
    assert.deepEqual(graticule.paint?.["line-opacity"], [
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
    ]);
  });

  it("adds water detail progressively from the existing basemap source", () => {
    const style = createGlobeStyle(testBasemapProvider);
    const lakes = findLayer(style.layers, "lakes");
    const rivers = findLayer(style.layers, "rivers");

    assert.equal(lakes.type, "fill");
    assert.equal(lakes.source, "basemap");
    assert.equal(lakes["source-layer"], "lakes");
    assert.equal(lakes.minzoom, 1);

    assert.equal(rivers.type, "line");
    assert.equal(rivers.source, "basemap");
    assert.equal(rivers["source-layer"], "rivers");
    assert.equal(rivers.minzoom, 2);
    assert.deepEqual(rivers.paint?.["line-opacity"], [
      "interpolate",
      ["linear"],
      ["zoom"],
      2,
      0.38,
      4,
      0.56,
      6,
      0.72,
    ]);
  });

  it("shows only the contracted reference boundaries at regional zoom", () => {
    const style = createGlobeStyle(testBasemapProvider);
    const boundaries = findLayer(style.layers, "boundaries");

    assert.equal(boundaries.type, "line");
    assert.equal(boundaries.source, "basemap");
    assert.equal(boundaries["source-layer"], "boundaries");
    assert.equal(boundaries.minzoom, 2.5);
    assert.deepEqual(boundaries.paint?.["line-opacity"], [
      "interpolate",
      ["linear"],
      ["zoom"],
      2.5,
      0.16,
      4,
      0.27,
      6,
      0.42,
    ]);
  });

  it("still renders a useful fallback style without the optional basemap", () => {
    const style = createGlobeStyle();

    assert.equal(Object.keys(style.sources).length, 1);
    assert.deepEqual(
      style.layers.map((layer) => layer.id),
      ["ocean", "graticule"],
    );
  });
});
