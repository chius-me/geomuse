import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  initialGlobeCamera,
  resolveCameraDuration,
} from "./camera.ts";

describe("globe camera", () => {
  it("uses a stable initial view", () => {
    assert.deepEqual(initialGlobeCamera.center, [108, 25]);
    assert.equal(initialGlobeCamera.zoom, 1.15);
    assert.equal(initialGlobeCamera.pitch, 0);
    assert.equal(initialGlobeCamera.bearing, 0);
  });

  it("disables camera animation when reduced motion is requested", () => {
    assert.equal(resolveCameraDuration(1_800, true), 0);
  });

  it("preserves normal camera animation duration", () => {
    assert.equal(resolveCameraDuration(1_800, false), 1_800);
  });

  it("never returns a negative animation duration", () => {
    assert.equal(resolveCameraDuration(-100, false), 0);
  });
});
