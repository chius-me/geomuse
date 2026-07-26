import assert from "node:assert/strict";
import test from "node:test";
import { GlobePerformanceAccumulator } from "./performance.ts";

test("records map load duration relative to engine start", () => {
  const performance = new GlobePerformanceAccumulator({
    startedAt: 100,
  });

  performance.recordMapLoad(460);

  assert.equal(performance.snapshot().mapLoadMs, 360);
});

test("summarizes frame samples and keeps a bounded window", () => {
  const performance = new GlobePerformanceAccumulator({
    startedAt: 0,
    frameSampleLimit: 3,
  });

  performance.recordFrame(0);
  performance.recordFrame(10);
  performance.recordFrame(30);
  performance.recordFrame(60);
  performance.recordFrame(100);

  assert.deepEqual(performance.snapshot(), {
    mapLoadMs: null,
    averageFrameMs: 30,
    p95FrameMs: 40,
    frameSampleCount: 3,
    longTaskCount: 0,
    maxLongTaskMs: null,
  });
});

test("ignores inactive gaps and invalid long tasks", () => {
  const performance = new GlobePerformanceAccumulator({
    startedAt: 0,
  });

  performance.recordFrame(10);
  performance.recordFrame(300);
  performance.recordFrame(316);
  performance.recordLongTask(0);
  performance.recordLongTask(72);
  performance.recordLongTask(54);

  assert.deepEqual(performance.snapshot(), {
    mapLoadMs: null,
    averageFrameMs: 16,
    p95FrameMs: 16,
    frameSampleCount: 1,
    longTaskCount: 2,
    maxLongTaskMs: 72,
  });
});
