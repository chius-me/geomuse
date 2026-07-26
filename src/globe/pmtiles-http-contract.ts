export const pmtilesProbeRange = {
  start: 0,
  end: 126,
  headerValue: "bytes=0-126",
  length: 127,
} as const;

type HeadersLike = {
  get(name: string): string | null;
};

type RangeResponseInput = {
  status: number;
  headers: HeadersLike;
  body: Uint8Array;
};

type CorsInput = {
  status: number;
  headers: HeadersLike;
  pageOrigin: string;
};

export function validatePmtilesRangeResponse({
  status,
  headers,
  body,
}: RangeResponseInput): string[] {
  const problems: string[] = [];

  if (status !== 206) {
    problems.push(`expected HTTP 206, received ${status}`);
  }

  if (!hasToken(headers.get("accept-ranges"), "bytes")) {
    problems.push("Accept-Ranges does not include bytes");
  }

  const contentRange = headers.get("content-range");
  const rangeMatch = contentRange?.match(
    /^bytes 0-126\/([1-9]\d*)$/i,
  );
  if (!rangeMatch) {
    problems.push(
      `invalid Content-Range: ${contentRange ?? "missing"}`,
    );
  } else if (
    Number(rangeMatch[1]) < pmtilesProbeRange.length
  ) {
    problems.push("Content-Range reports an invalid archive size");
  }

  if (body.byteLength !== pmtilesProbeRange.length) {
    problems.push(
      `expected ${pmtilesProbeRange.length} bytes, received ${body.byteLength}`,
    );
  }

  const magic = new TextDecoder().decode(body.subarray(0, 7));
  if (magic !== "PMTiles") {
    problems.push(`invalid PMTiles magic: ${magic || "missing"}`);
  }

  if (body[7] !== 3) {
    problems.push(
      `expected PMTiles spec v3, received v${body[7] ?? "unknown"}`,
    );
  }

  return problems;
}

export function validateCorsPreflight({
  status,
  headers,
  pageOrigin,
}: CorsInput): string[] {
  const problems: string[] = [];

  if (status < 200 || status >= 300) {
    problems.push(
      `expected successful CORS preflight, received ${status}`,
    );
  }

  validateAllowedOrigin(headers, pageOrigin, problems);

  for (const method of ["GET", "HEAD"]) {
    if (
      !hasToken(
        headers.get("access-control-allow-methods"),
        method,
      )
    ) {
      problems.push(
        `Access-Control-Allow-Methods does not include ${method}`,
      );
    }
  }

  for (const header of ["range", "if-match"]) {
    if (
      !hasToken(
        headers.get("access-control-allow-headers"),
        header,
      ) &&
      !hasToken(
        headers.get("access-control-allow-headers"),
        "*",
      )
    ) {
      problems.push(
        `Access-Control-Allow-Headers does not include ${header}`,
      );
    }
  }

  return problems;
}

export function validateCrossOriginRangeResponse({
  status,
  headers,
  pageOrigin,
}: CorsInput): string[] {
  const problems: string[] = [];

  if (status !== 206) {
    problems.push(`expected cross-origin HTTP 206, received ${status}`);
  }

  validateAllowedOrigin(headers, pageOrigin, problems);

  if (!headers.get("etag")) {
    problems.push("cross-origin PMTiles response does not include ETag");
  }

  if (
    !hasToken(
      headers.get("access-control-expose-headers"),
      "etag",
    ) &&
    !hasToken(
      headers.get("access-control-expose-headers"),
      "*",
    )
  ) {
    problems.push(
      "Access-Control-Expose-Headers does not include ETag",
    );
  }

  return problems;
}

function validateAllowedOrigin(
  headers: HeadersLike,
  pageOrigin: string,
  problems: string[],
) {
  const allowedOrigin = headers.get("access-control-allow-origin");

  if (allowedOrigin !== "*" && allowedOrigin !== pageOrigin) {
    problems.push(
      `Access-Control-Allow-Origin does not allow ${pageOrigin}`,
    );
  }
}

function hasToken(value: string | null, expected: string): boolean {
  return (
    value
      ?.split(",")
      .map((token) => token.trim().toLowerCase())
      .includes(expected.toLowerCase()) ?? false
  );
}
