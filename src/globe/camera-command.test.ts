import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveGlobeCameraCommand,
  type GlobeCameraCommand,
} from "./camera-command.ts";

describe("globe camera commands", () => {
  it("resolves stable defaults for every animated command", () => {
    assert.deepEqual(
      resolveGlobeCameraCommand(
        {
          type: "fly-to",
          target: { center: [121.47, 31.23], zoom: 4 },
        },
        false,
      ),
      {
        type: "fly-to",
        target: { center: [121.47, 31.23], zoom: 4 },
        durationMs: 1800,
      },
    );

    assert.deepEqual(
      resolveGlobeCameraCommand(
        {
          type: "fit-bounds",
          bounds: [
            [73, 18],
            [135, 54],
          ],
        },
        false,
      ),
      {
        type: "fit-bounds",
        bounds: [
          [73, 18],
          [135, 54],
        ],
        padding: 48,
        durationMs: 1200,
      },
    );

    const reset = resolveGlobeCameraCommand(
      { type: "reset" },
      false,
    );
    assert.equal(reset.type, "reset");
    assert.equal(
      reset.type === "reset" ? reset.durationMs : null,
      1200,
    );
  });

  it("turns every animated command into an immediate operation for reduced motion", () => {
    const commands: GlobeCameraCommand[] = [
      {
        type: "fly-to",
        target: { center: [0, 0] },
        durationMs: 900,
      },
      {
        type: "fit-bounds",
        bounds: [
          [-10, -10],
          [10, 10],
        ],
        durationMs: 900,
      },
      { type: "reset", durationMs: 900 },
    ];

    for (const command of commands) {
      const resolved = resolveGlobeCameraCommand(command, true);
      assert.ok(
        resolved.type === "fly-to" ||
          resolved.type === "fit-bounds" ||
          resolved.type === "reset",
      );
      assert.equal(
        resolved.type === "fly-to" ||
          resolved.type === "fit-bounds" ||
          resolved.type === "reset"
          ? resolved.durationMs
          : null,
        0,
      );
    }
  });

  it("keeps immediate jump and stop commands free of motion options", () => {
    const jump = {
      type: "jump-to",
      target: { center: [108, 25], zoom: 2 },
    } as const;
    const stop = { type: "stop" } as const;

    assert.equal(resolveGlobeCameraCommand(jump, false), jump);
    assert.equal(resolveGlobeCameraCommand(stop, false), stop);
  });

  it("rejects invalid coordinates, padding, and numeric options", () => {
    assert.throws(
      () =>
        resolveGlobeCameraCommand(
          {
            type: "jump-to",
            target: { center: [181, 0] },
          },
          false,
        ),
      /longitude/,
    );
    assert.throws(
      () =>
        resolveGlobeCameraCommand(
          {
            type: "fit-bounds",
            bounds: [
              [0, 0],
              [10, 10],
            ],
            padding: -1,
          },
          false,
        ),
      /padding/,
    );
    assert.throws(
      () =>
        resolveGlobeCameraCommand(
          {
            type: "fly-to",
            target: { center: [0, 0], zoom: Number.NaN },
          },
          false,
        ),
      /zoom/,
    );
    assert.throws(
      () =>
        resolveGlobeCameraCommand(
          {
            type: "fly-to",
            target: { center: [0, 0], zoom: 7 },
          },
          false,
        ),
      /zoom/,
    );
    assert.throws(
      () =>
        resolveGlobeCameraCommand(
          {
            type: "reset",
            durationMs: Number.POSITIVE_INFINITY,
          },
          false,
        ),
      /duration/,
    );
  });
});
