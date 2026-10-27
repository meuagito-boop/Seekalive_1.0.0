import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const applicationDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/modules/auth/application/challenges",
);
const [
  { createDeviceLoginChallenge },
  { createPasswordResetChallenge },
  { createPasswordUpdateChallenge },
] = await Promise.all([
  import("../src/modules/auth/application/challenges/deviceLogin.ts"),
  import("../src/modules/auth/application/challenges/passwordReset.ts"),
  import("../src/modules/auth/application/challenges/passwordUpdate.ts"),
]);

test("challenge application modules use injected persistence ports", async () => {
  const files = await readdir(applicationDirectory);
  for (const file of files.filter((name) => name.endsWith(".ts"))) {
    const source = await readFile(
      path.join(applicationDirectory, file),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /(?:from\s*|import\s*\()\s*["'](?:@workspace\/db|drizzle-orm)(?:\/[^"']*)?["']/,
      `${file} must not import database packages.`,
    );
  }
});

test("device-login challenge creation keeps its expiry and resend window", async () => {
  let persisted;
  const createChallenge = createDeviceLoginChallenge(async (input) => {
    persisted = input;
    return { email: "account@example.com", displayName: "Account" };
  });
  const result = await createChallenge("account-1", "device-token-hash");

  assert.ok(result);
  assert.equal(result.code.length, 6);
  assert.equal(result.emailMasked.includes("account@example.com"), false);
  assert.equal(persisted.accountId, "account-1");
  assert.equal(persisted.deviceTokenHash, "device-token-hash");
  assert.equal(persisted.challengeId, result.challengeId);
  assert.match(persisted.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(
    result.expiresAt.getTime() - result.createdAt.getTime(),
    10 * 60 * 1000,
  );
  assert.equal(
    result.resendAvailableAt.getTime() - result.createdAt.getTime(),
    30 * 1000,
  );
});

test("password-reset challenge creation preserves request limits and cooldown", async () => {
  let persisted;
  const createChallenge = createPasswordResetChallenge(async (input) => {
    persisted = input;
    return true;
  });
  const result = await createChallenge("account-2");

  assert.ok(result);
  assert.match(result.code, /^\d{6}$/);
  assert.match(result.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(persisted.accountId, "account-2");
  assert.equal(persisted.maxRequestsPerHour, 5);
  assert.equal(
    persisted.expiresAt.getTime() - persisted.now.getTime(),
    10 * 60 * 1000,
  );
  assert.equal(
    persisted.now.getTime() - persisted.cooldownSince.getTime(),
    60 * 1000,
  );
  assert.equal(
    persisted.now.getTime() - persisted.oneHourAgo.getTime(),
    60 * 60 * 1000,
  );
});

test("password-update challenge creation persists only the generated hash", async () => {
  let persisted;
  const createChallenge = createPasswordUpdateChallenge(async (input) => {
    persisted = input;
    return { email: "account@example.com", displayName: "Account" };
  });
  const result = await createChallenge(
    "account-3",
    "new-password-hash",
    "old-hash",
  );

  assert.ok(result);
  assert.equal(result.code.length, 6);
  assert.equal(persisted.accountId, "account-3");
  assert.equal(persisted.challengeId, result.challengeId);
  assert.equal(persisted.pendingPasswordHash, "new-password-hash");
  assert.equal(persisted.basePasswordHash, "old-hash");
  assert.match(persisted.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(
    result.expiresAt.getTime() - persisted.createdAt.getTime(),
    10 * 60 * 1000,
  );
});
