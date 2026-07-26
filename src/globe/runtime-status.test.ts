import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  describeGlobeError,
  initialGlobeRuntimeStatus,
  reduceGlobeRuntimeStatus,
} from "./runtime-status.ts";

describe("globe runtime status", () => {
  it("moves from loading to ready", () => {
    const ready = reduceGlobeRuntimeStatus(initialGlobeRuntimeStatus, {
      type: "ready",
    });

    assert.deepEqual(ready, {
      phase: "ready",
      message: "地球已就绪",
    });
  });

  it("keeps a failure terminal for the current initialization", () => {
    const failed = reduceGlobeRuntimeStatus(initialGlobeRuntimeStatus, {
      type: "fail",
      error: new Error("WebGL unavailable"),
    });
    const lateReady = reduceGlobeRuntimeStatus(failed, { type: "ready" });

    assert.equal(lateReady, failed);
    assert.equal(lateReady.phase, "error");
  });

  it("normalizes unknown errors for users", () => {
    assert.equal(
      describeGlobeError(null),
      "地球加载失败：浏览器无法启动地图渲染",
    );
  });

  it("can restart after an error", () => {
    const failed = reduceGlobeRuntimeStatus(initialGlobeRuntimeStatus, {
      type: "fail",
      error: "unknown",
    });

    assert.equal(
      reduceGlobeRuntimeStatus(failed, { type: "initialize" }),
      initialGlobeRuntimeStatus,
    );
  });
});
