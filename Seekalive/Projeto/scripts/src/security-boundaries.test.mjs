import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertLocalReferences } from "../../shared/api-spec/orval.config.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRequire = createRequire(
  path.resolve(here, "../../Aplicativo/back/package.json"),
);

test("Express resolves the patched proxy-addr version at runtime", () => {
  const expressPath = backendRequire.resolve("express");
  const expressRequire = createRequire(expressPath);
  const proxyAddrPath = expressRequire.resolve("proxy-addr");
  const packageJson = JSON.parse(
    readFileSync(
      path.resolve(path.dirname(proxyAddrPath), "package.json"),
      "utf8",
    ),
  );

  assert.equal(packageJson.version, "2.0.8");
});

test("Express keeps proxy trust disabled by default", () => {
  const express = backendRequire("express");
  const app = express();
  assert.equal(app.get("trust proxy"), false);
});

test("the frontend selects the rightmost valid IP in the forwarded chain", async () => {
  const { extractForwardedClientIp } =
    await import("../../Aplicativo/front/src/server/forwarded-client-ip.ts");
  assert.equal(
    extractForwardedClientIp("198.51.100.10, 203.0.113.42"),
    "203.0.113.42",
  );
  assert.equal(
    extractForwardedClientIp(["198.51.100.10", "2001:db8::42"]),
    "2001:db8::42",
  );
  assert.equal(extractForwardedClientIp("spoofed, not-an-ip"), null);
});

test("the backend accepts the internal client IP only from the loopback Vite proxy", async () => {
  const { getTrustedClientIp, isLoopbackProxyAddress } =
    await import("../../Aplicativo/back/src/security/trustedClientIp.ts");
  const makeRequest = (remoteAddress, forwardedClientIp) => ({
    socket: { remoteAddress },
    get(name) {
      return name.toLowerCase() === "x-seekalive-client-ip"
        ? forwardedClientIp
        : undefined;
    },
  });

  assert.equal(isLoopbackProxyAddress("127.0.0.1"), true);
  assert.equal(isLoopbackProxyAddress("::ffff:127.0.0.1"), true);
  assert.equal(isLoopbackProxyAddress("203.0.113.9"), false);
  assert.equal(
    getTrustedClientIp(makeRequest("::ffff:127.0.0.1", "203.0.113.42")),
    "203.0.113.42",
  );
  assert.equal(
    getTrustedClientIp(makeRequest("203.0.113.9", "198.51.100.10")),
    null,
  );
  assert.equal(getTrustedClientIp(makeRequest("127.0.0.1", "forged")), null);
});

test("database write guards use Replit's published-runtime marker", () => {
  const isolatedTest = readFileSync(
    path.resolve(here, "../../Aplicativo/back/test/api-isolated-db.test.mjs"),
    "utf8",
  );
  const postMergeScript = readFileSync(
    path.resolve(here, "../post-merge.sh"),
    "utf8",
  );

  assert.match(isolatedTest, /REPLIT_DEPLOYMENT/);
  assert.match(postMergeScript, /REPLIT_DEPLOYMENT/);
  assert.doesNotMatch(isolatedTest, /REPLIT_ENVIRONMENT/);
  assert.doesNotMatch(postMergeScript, /REPLIT_ENVIRONMENT/);
});

test("spoofed X-Forwarded-For cannot bypass the login IP rate limit", async () => {
  const { createAuthRateLimit } =
    await import("../../Aplicativo/back/src/security/rateLimit.ts");
  const express = backendRequire("express");
  const app = express();
  assert.equal(app.get("trust proxy"), false);
  app.get(
    "/login",
    createAuthRateLimit(`spoof-test-${process.pid}-${Date.now()}`, 2, 60_000),
    (request, response) => response.json({ ip: request.ip }),
  );

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    for (const forwardedIp of ["198.51.100.10", "198.51.100.11"]) {
      const response = await fetch(`http://127.0.0.1:${address.port}/login`, {
        headers: { "x-forwarded-for": forwardedIp },
      });
      assert.equal(response.status, 200);
      const payload = await response.json();
      assert.match(payload.ip, /^(::ffff:)?127\.0\.0\.1$/);
      assert.notEqual(payload.ip, forwardedIp);
    }

    const overLimit = await fetch(`http://127.0.0.1:${address.port}/login`, {
      headers: { "x-forwarded-for": "198.51.100.12" },
    });
    assert.equal(overLimit.status, 429);
    assert.ok(Number(overLimit.headers.get("retry-after")) > 0);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("OpenAPI local JSON Pointer references are allowed", () => {
  assert.doesNotThrow(() =>
    assertLocalReferences({
      paths: {
        "/health": {
          responses: {
            200: { schema: { $ref: "#/components/schemas/HealthStatus" } },
          },
        },
      },
    }),
  );
});

test("OpenAPI remote and file references are rejected", () => {
  for (const ref of [
    "https://example.invalid/schema.yaml",
    "../outside.yaml#/components/schemas/Thing",
    "#HealthStatus",
  ]) {
    assert.throws(
      () => assertLocalReferences({ components: { schema: { $ref: ref } } }),
      /not allowed/,
    );
  }
});
