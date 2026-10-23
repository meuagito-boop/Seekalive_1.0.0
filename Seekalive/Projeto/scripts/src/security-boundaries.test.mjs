import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTrustProxy } from "../../Aplicativo/back/src/security/trustProxy.ts";
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
    readFileSync(path.resolve(path.dirname(proxyAddrPath), "package.json"), "utf8"),
  );

  assert.equal(packageJson.version, "2.0.8");
});

test("proxy forwarding is ignored unless proxy CIDRs are explicitly configured", () => {
  assert.equal(createTrustProxy(), false);
  assert.equal(createTrustProxy(" , "), false);
});

test("only explicitly allowlisted proxy addresses are trusted", () => {
  const trust = createTrustProxy("127.0.0.1/32, 10.20.0.0/16");

  assert.equal(typeof trust, "function");
  if (typeof trust !== "function") {
    return;
  }

  assert.equal(trust("127.0.0.1", 0), true);
  assert.equal(trust("10.20.5.8", 1), true);
  assert.equal(trust("203.0.113.8", 0), false);
});

test("invalid trusted proxy CIDRs fail explicitly", () => {
  assert.throws(() => createTrustProxy("not-an-ip-range"));
});

test("OpenAPI local JSON Pointer references are allowed", () => {
  assert.doesNotThrow(() =>
    assertLocalReferences({
      paths: {
        "/health": {
          responses: {
            "200": { schema: { $ref: "#/components/schemas/HealthStatus" } },
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
