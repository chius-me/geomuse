import assert from "node:assert/strict";
import test from "node:test";
import {
  contentSecurityPolicy,
  securityHeaders,
} from "./headers.ts";

test("CSP permits only same-origin workers", () => {
  assert.match(
    contentSecurityPolicy,
    /(?:^|; )worker-src 'self'(?:;|$)/,
  );
  assert.doesNotMatch(
    contentSecurityPolicy,
    /worker-src[^;]*blob:/,
  );
});

test("CSP keeps executable resources on the same origin", () => {
  assert.match(
    contentSecurityPolicy,
    /(?:^|; )script-src 'self' 'unsafe-inline'(?:;|$)/,
  );
  assert.match(
    contentSecurityPolicy,
    /(?:^|; )connect-src 'self'(?:;|$)/,
  );
  assert.match(
    contentSecurityPolicy,
    /(?:^|; )object-src 'none'(?:;|$)/,
  );
});

test("baseline browser security headers are present", () => {
  const headers = new Map(
    securityHeaders.map(({ key, value }) => [key, value]),
  );

  assert.equal(
    headers.get("X-Content-Type-Options"),
    "nosniff",
  );
  assert.equal(headers.get("X-Frame-Options"), "DENY");
  assert.equal(
    headers.get("Referrer-Policy"),
    "strict-origin-when-cross-origin",
  );
});
