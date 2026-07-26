import {
  pmtilesProbeRange,
  validateCorsPreflight,
  validateCrossOriginRangeResponse,
  validatePmtilesRangeResponse,
} from "./pmtiles-http-contract.ts";

type VerifyPmtilesHttpOptions = {
  archiveUrl: string;
  pageOrigin: string;
  fetchImplementation?: typeof fetch;
};

export type PmtilesHttpVerification = {
  archiveUrl: string;
  pageOrigin: string;
  crossOrigin: boolean;
};

export async function verifyPmtilesHttp({
  archiveUrl,
  pageOrigin,
  fetchImplementation = fetch,
}: VerifyPmtilesHttpOptions): Promise<PmtilesHttpVerification> {
  const normalizedPageOrigin = new URL(pageOrigin).origin;
  const target = new URL(archiveUrl, normalizedPageOrigin);

  if (!["http:", "https:"].includes(target.protocol)) {
    throw new Error(
      "PMTiles HTTP verification requires HTTP or HTTPS",
    );
  }

  const crossOrigin = target.origin !== normalizedPageOrigin;
  const problems: string[] = [];

  if (crossOrigin) {
    const preflight = await fetchImplementation(target, {
      method: "OPTIONS",
      headers: {
        Origin: normalizedPageOrigin,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "range,if-match",
      },
    });

    problems.push(
      ...validateCorsPreflight({
        status: preflight.status,
        headers: preflight.headers,
        pageOrigin: normalizedPageOrigin,
      }),
    );
  }

  const rangeResponse = await fetchImplementation(target, {
    headers: {
      Range: pmtilesProbeRange.headerValue,
      ...(crossOrigin
        ? { Origin: normalizedPageOrigin }
        : {}),
    },
  });
  const body = new Uint8Array(
    await rangeResponse.arrayBuffer(),
  );

  problems.push(
    ...validatePmtilesRangeResponse({
      status: rangeResponse.status,
      headers: rangeResponse.headers,
      body,
    }),
  );

  if (crossOrigin) {
    problems.push(
      ...validateCrossOriginRangeResponse({
        status: rangeResponse.status,
        headers: rangeResponse.headers,
        pageOrigin: normalizedPageOrigin,
      }),
    );
  }

  if (problems.length) {
    throw new Error(
      `PMTiles HTTP contract failed for ${target.href}:\n- ${problems.join("\n- ")}`,
    );
  }

  return {
    archiveUrl: target.href,
    pageOrigin: normalizedPageOrigin,
    crossOrigin,
  };
}
