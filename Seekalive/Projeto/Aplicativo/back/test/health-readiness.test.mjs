import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { after, test } from "node:test";
import express from "express";
import { createHealthRouter } from "../src/modules/health/presentation/routes.ts";

const healthFiles = [
  new URL("../src/modules/health/presentation/readinessRoutes.ts", import.meta.url),
  new URL("../src/modules/health/presentation/routes.ts", import.meta.url),
];
const presentationSources = await Promise.all(healthFiles.map((file) => readFile(file, "utf8")));

assert.doesNotMatch(presentationSources.join("\n"), /@workspace\/db|drizzle-orm/);

async function withServer(checkDatabase, run) {
  const app = express();
  app.use(createHealthRouter(checkDatabase));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("readiness returns ready after a successful database probe", async () => {
  await withServer(async () => {}, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/readyz`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ready" });
  });
});

test("readiness returns a safe 503 on probe failure while liveness remains healthy", async () => {
  await withServer(async () => {
    throw new Error("private database connection details");
  }, async (baseUrl) => {
    const readiness = await fetch(`${baseUrl}/readyz`);
    assert.equal(readiness.status, 503);
    const readinessBody = await readiness.json();
    assert.deepEqual(readinessBody, { status: "not_ready" });
    assert.doesNotMatch(JSON.stringify(readinessBody), /private database connection details/i);

    const liveness = await fetch(`${baseUrl}/healthz`);
    assert.equal(liveness.status, 200);
    assert.deepEqual(await liveness.json(), { status: "ok" });
  });
});
