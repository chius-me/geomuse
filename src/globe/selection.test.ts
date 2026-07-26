import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGlobeSelectionChange } from "./selection.ts";

describe("globe feature selection", () => {
  it("selects the first selectable rendered feature", () => {
    const selection = createGlobeSelectionChange(
      [121.47, 31.23],
      [640, 360],
      [
        {
          layerId: "graticule",
          geometryType: "LineString",
        },
        {
          id: 42,
          layerId: "rivers",
          sourceId: "basemap",
          sourceLayer: "rivers",
          geometryType: "LineString",
          properties: {
            name: "示例河流",
            rank: 2,
            navigable: true,
            nullable: null,
          },
        },
      ],
    );

    assert.deepEqual(selection, {
      coordinate: [121.47, 31.23],
      screenPoint: [640, 360],
      feature: {
        id: 42,
        layerId: "rivers",
        sourceId: "basemap",
        sourceLayer: "rivers",
        geometryType: "LineString",
        properties: {
          name: "示例河流",
          rank: 2,
          navigable: true,
          nullable: null,
        },
      },
    });
  });

  it("returns an explicit empty selection for ocean or empty space", () => {
    assert.deepEqual(
      createGlobeSelectionChange([0, 0], [100, 100], [
        {
          layerId: "ocean",
          geometryType: "Polygon",
        },
      ]),
      {
        coordinate: [0, 0],
        screenPoint: [100, 100],
        feature: null,
      },
    );
  });

  it("drops unsupported ids and non-primitive properties", () => {
    const selection = createGlobeSelectionChange(
      [0, 0],
      [0, 0],
      [
        {
          id: { unstable: true },
          layerId: "land",
          geometryType: "Polygon",
          properties: {
            valid: "value",
            infinite: Number.POSITIVE_INFINITY,
            nested: { unsupported: true },
          },
        },
      ],
    );

    assert.deepEqual(selection.feature, {
      id: undefined,
      layerId: "land",
      sourceId: undefined,
      sourceLayer: undefined,
      geometryType: "Polygon",
      properties: {
        valid: "value",
      },
    });
  });
});
