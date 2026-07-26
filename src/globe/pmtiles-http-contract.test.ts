import assert from "node:assert/strict";
import { createServer } from "node:http";
import { describe, it } from "node:test";
import {
  pmtilesProbeRange,
  validateCorsPreflight,
  validateCrossOriginRangeResponse,
  validatePmtilesRangeResponse,
} from "./pmtiles-http-contract.ts";
import { verifyPmtilesHttp } from "./pmtiles-http-verifier.ts";

function createPmtilesHeader() {
  const body = new Uint8Array(pmtilesProbeRange.length);
  body.set(new TextEncoder().encode("PMTiles"));
  body[7] = 3;
  return body;
}

describe("PMTiles HTTP contract", () => {
  it("accepts a valid local byte-range response", () => {
    const problems = validatePmtilesRangeResponse({
      status: 206,
      headers: new Headers({
        "accept-ranges": "bytes",
        "content-range": "bytes 0-126/396615",
      }),
      body: createPmtilesHeader(),
    });

    assert.deepEqual(problems, []);
  });

  it("rejects a full-file or malformed range response", () => {
    const problems = validatePmtilesRangeResponse({
      status: 200,
      headers: new Headers(),
      body: new Uint8Array(4),
    });

    assert.ok(problems.length >= 4);
  });

  it("accepts the documented PMTiles cross-origin CORS policy", () => {
    const pageOrigin = "https://geomuse.example.com";
    const preflightProblems = validateCorsPreflight({
      status: 204,
      pageOrigin,
      headers: new Headers({
        "access-control-allow-origin": pageOrigin,
        "access-control-allow-methods": "GET, HEAD",
        "access-control-allow-headers": "Range, If-Match",
      }),
    });
    const responseProblems = validateCrossOriginRangeResponse({
      status: 206,
      pageOrigin,
      headers: new Headers({
        "access-control-allow-origin": pageOrigin,
        "access-control-expose-headers": "ETag",
        etag: '"immutable-v1"',
      }),
    });

    assert.deepEqual(preflightProblems, []);
    assert.deepEqual(responseProblems, []);
  });

  it("reports missing remote preflight and ETag permissions", () => {
    const pageOrigin = "https://geomuse.example.com";

    assert.ok(
      validateCorsPreflight({
        status: 403,
        pageOrigin,
        headers: new Headers(),
      }).length >= 5,
    );
    assert.ok(
      validateCrossOriginRangeResponse({
        status: 206,
        pageOrigin,
        headers: new Headers({
          "access-control-allow-origin": "*",
        }),
      }).length >= 2,
    );
  });

  it("verifies a real cross-origin OPTIONS and Range exchange", async () => {
    const pageOrigin = "http://127.0.0.1:1";
    const body = createPmtilesHeader();
    const server = createServer((request, response) => {
      response.setHeader(
        "Access-Control-Allow-Origin",
        pageOrigin,
      );

      if (request.method === "OPTIONS") {
        response.writeHead(204, {
          "Access-Control-Allow-Methods": "GET, HEAD",
          "Access-Control-Allow-Headers": "Range, If-Match",
        });
        response.end();
        return;
      }

      if (request.headers.range !== pmtilesProbeRange.headerValue) {
        response.writeHead(416);
        response.end();
        return;
      }

      response.writeHead(206, {
        "Accept-Ranges": "bytes",
        "Content-Range": "bytes 0-126/127",
        "Content-Length": body.byteLength,
        "Access-Control-Expose-Headers": "ETag",
        ETag: '"contract-v1"',
      });
      response.end(body);
    });

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    try {
      const address = server.address();
      assert.ok(address && typeof address !== "string");

      const result = await verifyPmtilesHttp({
        archiveUrl: `http://127.0.0.1:${address.port}/basemap.pmtiles`,
        pageOrigin,
      });

      assert.equal(result.crossOrigin, true);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) =>
          error ? reject(error) : resolve(),
        );
      });
    }
  });
});
