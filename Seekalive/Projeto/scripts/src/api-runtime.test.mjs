import assert from "node:assert/strict";
import { once } from "node:events";
import { after, test } from "node:test";

process.env.SESSION_SECRET ??= "test-only-session-secret-at-least-32-bytes";
process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:1/seekalive_test";

const [{ default: app }, { pool }] = await Promise.all([
  import("../../Aplicativo/back/src/app.ts"),
  import("../../infra/database/src/index.ts"),
]);

const server = app.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
assert.ok(address && typeof address === "object");
const baseUrl = `http://127.0.0.1:${address.port}`;

function assertRequestId(response, body) {
  const requestId = response.headers.get("x-request-id");
  assert.match(requestId ?? "", /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  if (body?.error && typeof body.error === "object" && "requestId" in body.error) {
    assert.equal(body.error.requestId, requestId);
  }
  return requestId;
}

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await pool.end();
});

test("liveness stays available without depending on database readiness", async () => {
  const response = await fetch(`${baseUrl}/api/healthz`, {
    headers: { "x-request-id": "client-controlled-id" },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
  assert.notEqual(assertRequestId(response), "client-controlled-id");
});

test("readiness reports database availability without exposing connection details", async () => {
  const response = await fetch(`${baseUrl}/api/readyz`);
  assert.ok(response.status === 200 || response.status === 503);
  const body = await response.json();
  assert.equal(body.status, response.status === 200 ? "ready" : "not_ready");
  assertRequestId(response);
  assert.doesNotMatch(JSON.stringify(body), /postgres|database_url|connection refused|password/i);
});

test("unknown API paths return a JSON 404 with the request ID", async () => {
  const response = await fetch(`${baseUrl}/api/path-that-does-not-exist`);
  assert.equal(response.status, 404);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/i);
  const body = await response.json();
  assert.equal(body.error.key, "NOT_FOUND");
  assert.equal(body.error.code, 1003);
  assertRequestId(response, body);
});

test("protected profile routes return a traceable authentication error", async () => {
  const response = await fetch(`${baseUrl}/api/v1/accounts/me`);
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.error.key, "UNAUTHENTICATED");
  assert.equal(body.error.code, 1101);
  assertRequestId(response, body);
});

test("CSRF rejections use the same traceable error contract", async () => {
  const response = await fetch(`${baseUrl}/api/v1/onboarding/interests`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ interests: [] }),
  });
  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.error.key, "CSRF_REJECTED");
  assert.equal(body.error.code, 1106);
  assertRequestId(response, body);
});
