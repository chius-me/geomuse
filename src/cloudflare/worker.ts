import { resolveByteRange } from "./byte-range";
import { securityHeaders } from "../security/headers";

type Env = {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
};

type WorkerContext = {
  waitUntil(promise: Promise<unknown>): void;
};

type CloudflareCacheStorage = CacheStorage & {
  default: Cache;
};

const pmtilesCacheControl =
  "public, max-age=0, s-maxage=3600, must-revalidate";

const worker = {
  async fetch(
    request: Request,
    env: Env,
    context: WorkerContext,
  ): Promise<Response> {
    if (!["GET", "HEAD"].includes(request.method)) {
      return env.ASSETS.fetch(request);
    }

    const cache = (caches as CloudflareCacheStorage).default;
    const cacheKey = new Request(request.url, { method: "GET" });
    const cachedResponse = await cache.match(cacheKey);
    const fullResponse =
      (await fullResponseFromCache(cachedResponse)) ??
      (await fetchFullAsset(request, env));

    if (!fullResponse.ok) {
      return withSecurityHeaders(fullResponse);
    }

    if (fullResponse.headers.get("Content-Length") !== "0") {
      context.waitUntil(cache.put(cacheKey, fullResponse.clone()));
    }

    if (request.method === "HEAD") {
      return withSecurityHeaders(
        new Response(null, responseInit(fullResponse)),
      );
    }

    return createRangeResponse(
      fullResponse,
      request.headers.get("Range"),
    );
  },
};

export default worker;

async function fullResponseFromCache(cachedResponse: Response | undefined) {
  if (!cachedResponse?.ok) {
    return null;
  }

  const body = await cachedResponse.arrayBuffer();

  if (body.byteLength === 0) {
    return null;
  }

  return withPmtilesHeaders(
    new Response(body, responseInit(cachedResponse)),
  );
}

async function fetchFullAsset(request: Request, env: Env) {
  const assetResponse = await env.ASSETS.fetch(asGetWithoutRange(request));

  if (!assetResponse.ok) {
    return assetResponse;
  }

  return withPmtilesHeaders(assetResponse);
}

function asGetWithoutRange(request: Request) {
  const headers = new Headers(request.headers);
  headers.delete("Range");
  headers.delete("If-Range");

  return new Request(request.url, { method: "GET", headers });
}

function withPmtilesHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", pmtilesCacheControl);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function createRangeResponse(
  response: Response,
  rangeHeader: string | null,
) {
  const body = await response.arrayBuffer();
  const range = resolveByteRange(rangeHeader, body.byteLength);

  if (range.kind === "full") {
    return withSecurityHeaders(
      new Response(body, responseInit(response)),
    );
  }

  const headers = new Headers(response.headers);

  if (range.kind === "unsatisfiable") {
    headers.set(
      "Content-Range",
      `bytes */${body.byteLength}`,
    );
    headers.set("Content-Length", "0");
    headers.set("Cache-Control", "no-store");

    return withSecurityHeaders(
      new Response(null, { status: 416, headers }),
    );
  }

  const partialBody = body.slice(
    range.start,
    range.end + 1,
  );
  headers.set(
    "Content-Range",
    `bytes ${range.start}-${range.end}/${body.byteLength}`,
  );
  headers.set(
    "Content-Length",
    String(partialBody.byteLength),
  );

  return withSecurityHeaders(
    new Response(partialBody, { status: 206, headers }),
  );
}

function withSecurityHeaders(response: Response) {
  const headers = new Headers(response.headers);

  for (const { key, value } of securityHeaders) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function responseInit(response: Response): ResponseInit {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  };
}
