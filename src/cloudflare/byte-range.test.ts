import assert from "node:assert/strict";
import test from "node:test";
import { resolveByteRange } from "./byte-range.ts";

test("resolves explicit and open-ended byte ranges", () => {
  assert.deepEqual(resolveByteRange("bytes=10-19", 100), {
    kind: "partial",
    start: 10,
    end: 19,
  });
  assert.deepEqual(resolveByteRange("bytes=90-", 100), {
    kind: "partial",
    start: 90,
    end: 99,
  });
});

test("resolves suffix ranges and clamps them to the asset", () => {
  assert.deepEqual(resolveByteRange("bytes=-10", 100), {
    kind: "partial",
    start: 90,
    end: 99,
  });
  assert.deepEqual(resolveByteRange("bytes=-200", 100), {
    kind: "partial",
    start: 0,
    end: 99,
  });
});

test("rejects multiple, reversed, empty, and out-of-bounds ranges", () => {
  for (const range of [
    "bytes=0-1,3-4",
    "bytes=20-10",
    "bytes=-0",
    "bytes=100-",
    "items=0-10",
  ]) {
    assert.deepEqual(resolveByteRange(range, 100), {
      kind: "unsatisfiable",
    });
  }
});

test("returns the complete asset when Range is absent", () => {
  assert.deepEqual(resolveByteRange(null, 100), {
    kind: "full",
  });
});
