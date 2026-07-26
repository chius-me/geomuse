import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createBasemapProvider,
  createPmtilesTileTemplate,
  resolveBasemapProvider,
} from "./basemap-provider.ts";

describe("basemap provider", () => {
  it("uses the local Natural Earth archive by default", () => {
    const provider = createBasemapProvider();
    const resolved = resolveBasemapProvider(
      provider,
      "http://localhost:3000",
    );

    assert.equal(provider.id, "natural-earth-local");
    assert.equal(
      resolved?.archiveUrl,
      "http://localhost:3000/maps/geomuse-basemap.pmtiles",
    );
    assert.equal(resolved?.crossOrigin, false);
  });

  it("treats an empty environment value as the local provider", () => {
    assert.equal(
      createBasemapProvider("   ").url,
      "/maps/geomuse-basemap.pmtiles",
    );
  });

  it("resolves a remote archive and marks its CORS requirement", () => {
    const resolved = resolveBasemapProvider(
      createBasemapProvider(
        "https://static.example.com/maps/basemap-v1.pmtiles",
      ),
      "https://geomuse.example.com",
    );

    assert.equal(resolved?.id, "natural-earth-remote");
    assert.equal(resolved?.crossOrigin, true);
    assert.equal(
      createPmtilesTileTemplate(resolved!),
      "pmtiles://https://static.example.com/maps/basemap-v1.pmtiles/{z}/{x}/{y}",
    );
  });

  it("rejects unsupported protocols, credentials, fragments, and mixed content", () => {
    const invalidCases = [
      "data:application/octet-stream;base64,AA==",
      "https://user:secret@static.example.com/basemap.pmtiles",
      "https://static.example.com/basemap.pmtiles?v=1",
      "https://static.example.com/basemap.pmtiles#latest",
      "https://static.example.com/basemap.bin",
    ];

    for (const url of invalidCases) {
      assert.throws(() =>
        resolveBasemapProvider(
          createBasemapProvider(url),
          "https://geomuse.example.com",
        ),
      );
    }

    assert.throws(() =>
      resolveBasemapProvider(
        createBasemapProvider(
          "http://static.example.com/basemap.pmtiles",
        ),
        "https://geomuse.example.com",
      ),
    );
  });

  it("keeps an omitted provider available for the diagnostic globe", () => {
    assert.equal(
      resolveBasemapProvider(
        undefined,
        "http://localhost:3000",
      ),
      undefined,
    );
  });
});
