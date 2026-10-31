import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { startIsolatedHttpApiHarness } from "./support/isolatedHttpApiHarness.mjs";

let harness;

before(async () => {
  harness = await startIsolatedHttpApiHarness({
    sessionSecret: "seekalive-health-api-isolated-session-secret",
  });
});

after(async () => {
  await harness?.close();
});

test("mounted liveness and readiness routes respond over HTTP with isolated development DB", async () => {
  const liveness = await harness.request("/api/healthz");
  assert.equal(liveness.response.status, 200);
  assert.deepEqual(liveness.body, { status: "ok" });

  const readiness = await harness.request("/api/readyz");
  assert.equal(readiness.response.status, 200);
  assert.deepEqual(readiness.body, { status: "ready" });
  assert.equal(JSON.stringify(readiness.body).includes("DATABASE_URL"), false);
});

test("readiness fails closed over HTTP without exposing dependency errors", async () => {
  const pool = harness.database.pool;
  const originalQuery = pool.query;
  pool.query = async () => {
    throw new Error("simulated readiness dependency failure");
  };

  try {
    const readiness = await harness.request("/api/readyz");
    assert.equal(readiness.response.status, 503);
    assert.deepEqual(readiness.body, { status: "not_ready" });
    assert.equal(
      JSON.stringify(readiness.body).includes(
        "simulated readiness dependency failure",
      ),
      false,
    );
    assert.equal(
      JSON.stringify(readiness.body).includes("DATABASE_URL"),
      false,
    );
  } finally {
    pool.query = originalQuery;
  }
});
