import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { basemapContract } from "./basemap-contract.ts";
import {
  createDefaultLayerGroupVisibility,
  getGlobeLayerIdsForGroup,
  getSelectableGlobeLayerIds,
  globeLayerGroups,
  globeLayerRegistry,
  isGlobeLayerGroupId,
  isSelectableGlobeLayerId,
} from "./layer-registry.ts";

describe("globe layer registry", () => {
  it("uses unique stable ids and covers every basemap source layer", () => {
    const registeredIds = Object.values(
      globeLayerRegistry,
    ).map(({ id }) => id);
    const sourceLayers = Object.values(globeLayerRegistry).flatMap(
      (layer) =>
        "sourceLayer" in layer ? [layer.sourceLayer] : [],
    );

    assert.equal(
      new Set(registeredIds).size,
      registeredIds.length,
    );
    assert.deepEqual(
      sourceLayers,
      basemapContract.layers.map(({ id }) => id),
    );
  });

  it("only exposes toggleable layers through semantic groups", () => {
    const groupedLayerIds = globeLayerGroups.flatMap(
      ({ layerIds }) => layerIds,
    );

    for (const layerId of groupedLayerIds) {
      assert.equal(
        globeLayerRegistry[layerId].toggleable,
        true,
      );
    }

    assert.deepEqual(
      getGlobeLayerIdsForGroup("water"),
      ["lakes", "rivers"],
    );
  });

  it("creates an independent default visibility snapshot", () => {
    const first = createDefaultLayerGroupVisibility();
    const second = createDefaultLayerGroupVisibility();

    first.water = false;

    assert.equal(second.water, true);
    assert.deepEqual(second, {
      water: true,
      boundaries: true,
      graticule: true,
    });
    assert.equal(isGlobeLayerGroupId("water"), true);
    assert.equal(isGlobeLayerGroupId("unknown"), false);
  });

  it("exposes only geographic data layers for selection", () => {
    assert.deepEqual(getSelectableGlobeLayerIds(), [
      "land",
      "lakes",
      "rivers",
      "boundaries",
    ]);
    assert.equal(isSelectableGlobeLayerId("rivers"), true);
    assert.equal(isSelectableGlobeLayerId("graticule"), false);
    assert.equal(isSelectableGlobeLayerId("unknown"), false);
  });
});
