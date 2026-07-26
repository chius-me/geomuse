import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDefaultGlobeUrlState,
  createGlobeShareUrl,
  parseGlobeUrlState,
} from "./url-state.ts";

describe("globe URL state", () => {
  it("uses the clean default state when parameters are absent", () => {
    assert.deepEqual(
      parseGlobeUrlState("?unrelated=kept"),
      createDefaultGlobeUrlState(),
    );
  });

  it("parses a versioned camera and hidden layer groups", () => {
    assert.deepEqual(
      parseGlobeUrlState(
        "?gm-view=1,121.47,31.23,4.5,-12,20&gm-hidden=water,graticule",
      ),
      {
        camera: {
          center: [121.47, 31.23],
          zoom: 4.5,
          bearing: -12,
          pitch: 20,
        },
        layerVisibility: {
          water: false,
          boundaries: true,
          graticule: false,
        },
      },
    );
  });

  it("falls back safely for unsupported or invalid camera values", () => {
    const defaults = createDefaultGlobeUrlState();

    assert.deepEqual(
      parseGlobeUrlState(
        "?gm-view=2,0,0,1,0,0&gm-hidden=unknown,boundaries",
      ),
      {
        camera: defaults.camera,
        layerVisibility: {
          water: true,
          boundaries: false,
          graticule: true,
        },
      },
    );
    assert.deepEqual(
      parseGlobeUrlState("?gm-view=1,181,0,1,0,0").camera,
      defaults.camera,
    );
    assert.deepEqual(
      parseGlobeUrlState(
        "?gm-view=1,0,0,NaN,0,0,unexpected",
      ).camera,
      defaults.camera,
    );
  });

  it("omits defaults and preserves unrelated query parameters", () => {
    const url = createGlobeShareUrl(
      new URL("https://geomuse.example/?ref=demo"),
      createDefaultGlobeUrlState(),
    );

    assert.equal(
      url.toString(),
      "https://geomuse.example/?ref=demo",
    );
  });

  it("round-trips a compact camera and layer state", () => {
    const state = createDefaultGlobeUrlState();
    state.camera = {
      center: [114.057868, 22.543099],
      zoom: 3.45678,
      bearing: -0,
      pitch: 12.345,
    };
    state.layerVisibility.water = false;
    state.layerVisibility.graticule = false;

    const url = createGlobeShareUrl(
      new URL("https://geomuse.example/"),
      state,
    );

    assert.equal(
      url.searchParams.get("gm-view"),
      "1,114.05787,22.5431,3.457,0,12.35",
    );
    assert.equal(
      url.searchParams.get("gm-hidden"),
      "water,graticule",
    );
    assert.deepEqual(parseGlobeUrlState(url.search), {
      camera: {
        center: [114.05787, 22.5431],
        zoom: 3.457,
        bearing: 0,
        pitch: 12.35,
      },
      layerVisibility: {
        water: false,
        boundaries: true,
        graticule: false,
      },
    });
  });
});
