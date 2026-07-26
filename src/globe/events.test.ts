import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GlobeEventHub,
  normalizeGlobeEventError,
  type GlobeEvent,
} from "./events.ts";

describe("globe event hub", () => {
  it("delivers typed events in emission order", () => {
    const hub = new GlobeEventHub();
    const received: GlobeEvent[] = [];

    hub.subscribe((event) => received.push(event));
    hub.emit({ type: "ready" });
    hub.emit({
      type: "layer-visibility-change",
      groupId: "water",
      visible: false,
    });

    assert.deepEqual(received, [
      { type: "ready" },
      {
        type: "layer-visibility-change",
        groupId: "water",
        visible: false,
      },
    ]);
  });

  it("uses a stable listener snapshot during emission", () => {
    const hub = new GlobeEventHub();
    const calls: string[] = [];
    let unsubscribeSecond = () => {};

    hub.subscribe(() => {
      calls.push("first");
      unsubscribeSecond();
    });
    unsubscribeSecond = hub.subscribe(() => {
      calls.push("second");
    });

    hub.emit({ type: "ready" });
    hub.emit({ type: "ready" });

    assert.deepEqual(calls, ["first", "second", "first"]);
  });

  it("supports idempotent unsubscribe and full cleanup", () => {
    const hub = new GlobeEventHub();
    let count = 0;
    const unsubscribe = hub.subscribe(() => {
      count += 1;
    });

    unsubscribe();
    unsubscribe();
    hub.emit({ type: "ready" });

    hub.subscribe(() => {
      count += 1;
    });
    hub.clear();
    hub.emit({ type: "ready" });

    assert.equal(count, 0);
  });

  it("normalizes non-Error failures at the bridge boundary", () => {
    const existing = new Error("WebGL unavailable");

    assert.equal(normalizeGlobeEventError(existing), existing);
    assert.equal(
      normalizeGlobeEventError(null).message,
      "浏览器无法启动地图渲染",
    );
  });
});
