import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  basemapContract,
  filterFeaturesForLayer,
} from "./basemap-contract.ts";

describe("basemap contract", () => {
  it("has an explicit version and unique source layer ids", () => {
    const ids = basemapContract.layers.map(({ id }) => id);

    assert.equal(basemapContract.version, 1);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("excludes disputed and indeterminate boundary classes", () => {
    const boundaries = basemapContract.layers.find(
      ({ id }) => id === "boundaries",
    );

    assert.ok(boundaries);

    const features = [
      {
        properties: {
          FEATURECLA: "International boundary (verify)",
        },
      },
      {
        properties: {
          FEATURECLA: "Disputed (please verify)",
        },
      },
      {
        properties: {
          FEATURECLA: "Line of control (please verify)",
        },
      },
      {
        properties: {
          FEATURECLA: "Indefinite (please verify)",
        },
      },
    ];

    assert.deepEqual(
      filterFeaturesForLayer(features, boundaries),
      [features[0]],
    );
  });
});
