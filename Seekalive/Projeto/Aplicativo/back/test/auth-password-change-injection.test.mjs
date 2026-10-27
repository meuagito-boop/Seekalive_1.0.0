import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import argon2 from "argon2";
import test from "node:test";
import { PASSWORD_POLICY_VERSION } from "@workspace/api-zod";
import { hashAccountPasswordChangeCode } from "../src/security/session.ts";
import { createConfirmPasswordChange } from "../src/modules/auth/application/passwordChange/confirmPasswordChange.ts";
import { createRequestPasswordChange } from "../src/modules/auth/application/passwordChange/requestPasswordChange.ts";
import { MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS } from "../src/modules/auth/application/accountSecurity/policy.ts";

const applicationDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/modules/auth/application/passwordChange",
);
const accountId = "account-password-change";
const challengeId = "challenge-password-change";
const currentPassword = "Current!Password2026";
const newPassword = "New!Password2026";
const currentPasswordHash = await argon2.hash(currentPassword);
const currentAccount = {
  status: "active",
  securityLockedAt: null,
  email: "person@example.com",
  emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  displayName: "Person",
  passwordHash: currentPasswordHash,
};

function createRequestRepository(overrides = {}) {
  const calls = [];
  const repository = {
    async withTransaction(operation) {
      calls.push({ method: "withTransaction" });
      return operation({
        async lockOwner(receivedAccountId) {
          calls.push({ method: "lockOwner", accountId: receivedAccountId });
          return overrides.owner === undefined
            ? currentAccount
            : overrides.owner;
        },
        async findRecentChallenges(input) {
          calls.push({ method: "findRecentChallenges", input });
          return overrides.recentChallenges ?? [];
        },
        async consumeActiveChallenges(receivedAccountId, now) {
          calls.push({
            method: "consumeActiveChallenges",
            accountId: receivedAccountId,
            now,
          });
        },
        async createChallenge(input) {
          calls.push({ method: "createChallenge", input });
          overrides.onCreateChallenge?.(input);
        },
      });
    },
  };
  return { repository, calls };
}

function createConfirmationRepository(overrides = {}) {
  const calls = [];
  const repository = {
    async withTransaction(operation) {
      calls.push({ method: "withTransaction" });
      return operation({
        async lockOwner(receivedAccountId) {
          calls.push({ method: "lockOwner", accountId: receivedAccountId });
          return overrides.owner === undefined
            ? {
                status: "active",
                securityLockedAt: null,
                emailVerifiedAt: currentAccount.emailVerifiedAt,
              }
            : overrides.owner;
        },
        async lockChallenge(input) {
          calls.push({ method: "lockChallenge", input });
          return overrides.challenge === undefined
            ? overrides.defaultChallenge
            : overrides.challenge;
        },
        async recordInvalidAttempt(input) {
          calls.push({ method: "recordInvalidAttempt", input });
        },
        async consumeChallenge(input) {
          calls.push({ method: "consumeChallenge", input });
          return overrides.consumeChallenge ?? true;
        },
        async updatePasswordCredential(input) {
          calls.push({ method: "updatePasswordCredential", input });
          return overrides.credentialUpdated ?? true;
        },
        async clearChallengePasswordMaterial(receivedChallengeId) {
          calls.push({
            method: "clearChallengePasswordMaterial",
            challengeId: receivedChallengeId,
          });
        },
        async revokeSessions(receivedAccountId, now) {
          calls.push({
            method: "revokeSessions",
            accountId: receivedAccountId,
            now,
          });
        },
        async revokeTrustedDevices(receivedAccountId, now) {
          calls.push({
            method: "revokeTrustedDevices",
            accountId: receivedAccountId,
            now,
          });
        },
        async consumeRelatedChallenges(receivedAccountId, now) {
          calls.push({
            method: "consumeRelatedChallenges",
            accountId: receivedAccountId,
            now,
          });
        },
      });
    },
  };
  return { repository, calls };
}

function validChallenge(code = "123456", attempts = 0) {
  return {
    id: challengeId,
    tokenHash: hashAccountPasswordChangeCode(accountId, challengeId, code),
    pendingPasswordHash: "pending-password-hash",
    basePasswordHash: currentPasswordHash,
    attempts,
  };
}

test("password-change application modules use injected ports, not persistence", async () => {
  const files = await readdir(applicationDirectory);
  for (const file of files.filter((name) => name.endsWith(".ts"))) {
    const source = await readFile(
      path.join(applicationDirectory, file),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /(?:from\s*|import\s*\()\s*["'](?:@workspace\/db|drizzle-orm|..\/..\/infrastructure)(?:\/[^"']*)?["']/,
      `${file} must not import database or infrastructure packages.`,
    );
  }
});

test("request rejects a reused password before creating a challenge", async () => {
  let emailDeliveryRequested = false;
  const { repository } = createRequestRepository();
  const request = createRequestPasswordChange({
    repository,
    security: {
      async verifyCurrentPassword() {
        return {
          kind: "verified",
          email: currentAccount.email,
          displayName: currentAccount.displayName,
          passwordHash: currentPasswordHash,
        };
      },
      async invalidateChallenge() {},
    },
    getEmailDelivery() {
      emailDeliveryRequested = true;
      return { isConfigured: false, async sendAccountPasswordChangeCode() {} };
    },
  });

  assert.deepEqual(await request(accountId, currentPassword, currentPassword), {
    kind: "password_reuse",
  });
  assert.equal(emailDeliveryRequested, false);
});

test("request stores challenge hashes transactionally and emails only after commit", async () => {
  let persistedChallenge;
  let sentMessage;
  const { repository, calls } = createRequestRepository({
    onCreateChallenge(input) {
      persistedChallenge = input;
    },
  });
  const request = createRequestPasswordChange({
    repository,
    security: {
      async verifyCurrentPassword() {
        return {
          kind: "verified",
          email: currentAccount.email,
          displayName: currentAccount.displayName,
          passwordHash: currentPasswordHash,
        };
      },
      async invalidateChallenge() {
        assert.fail("Successful delivery must not invalidate the challenge.");
      },
    },
    getEmailDelivery() {
      return {
        isConfigured: true,
        async sendAccountPasswordChangeCode(message) {
          assert.ok(
            calls.some((call) => call.method === "createChallenge"),
            "Challenge persistence must complete before email is sent.",
          );
          sentMessage = message;
        },
      };
    },
  });

  const result = await request(accountId, currentPassword, newPassword);

  assert.equal(result.kind, "created");
  assert.match(result.emailMasked, /^pe\*+@example\.com$/);
  assert.equal(persistedChallenge.accountId, accountId);
  assert.equal(persistedChallenge.attempts, 0);
  assert.equal(persistedChallenge.basePasswordHash, currentPasswordHash);
  assert.match(persistedChallenge.tokenHash, /^[a-f0-9]{64}$/);
  assert.equal(
    await argon2.verify(persistedChallenge.pendingPasswordHash, newPassword),
    true,
  );
  assert.match(sentMessage.code, /^\d{6}$/);
  assert.equal(sentMessage.email, currentAccount.email);
  assert.equal(JSON.stringify(result).includes(sentMessage.code), false);
  assert.equal(JSON.stringify(result).includes(currentAccount.email), false);
  assert.equal(
    persistedChallenge.expiresAt.getTime() -
      persistedChallenge.createdAt.getTime(),
    10 * 60 * 1000,
  );
});

test("request stops when current password verification fails", async () => {
  const { repository, calls } = createRequestRepository();
  const request = createRequestPasswordChange({
    repository,
    security: {
      async verifyCurrentPassword() {
        return { kind: "invalid_credentials" };
      },
      async invalidateChallenge() {},
    },
    getEmailDelivery() {
      return { isConfigured: true, async sendAccountPasswordChangeCode() {} };
    },
  });

  assert.deepEqual(await request(accountId, "wrong", newPassword), {
    kind: "invalid_current_password",
  });
  assert.equal(
    calls.some((call) => call.method === "withTransaction"),
    false,
  );
});

test("request does not open a transaction when email delivery is unavailable", async () => {
  const { repository, calls } = createRequestRepository();
  const request = createRequestPasswordChange({
    repository,
    security: {
      async verifyCurrentPassword() {
        return {
          kind: "verified",
          email: currentAccount.email,
          displayName: currentAccount.displayName,
          passwordHash: currentPasswordHash,
        };
      },
      async invalidateChallenge() {},
    },
    getEmailDelivery() {
      return { isConfigured: false, async sendAccountPasswordChangeCode() {} };
    },
  });

  assert.deepEqual(await request(accountId, currentPassword, newPassword), {
    kind: "delivery_unavailable",
  });
  assert.equal(
    calls.some((call) => call.method === "withTransaction"),
    false,
  );
});

test("request does not create a challenge for an inactive account", async () => {
  const { repository, calls } = createRequestRepository({
    owner: { ...currentAccount, status: "disabled" },
  });
  const request = createRequestPasswordChange({
    repository,
    security: {
      async verifyCurrentPassword() {
        return {
          kind: "verified",
          email: currentAccount.email,
          displayName: currentAccount.displayName,
          passwordHash: currentPasswordHash,
        };
      },
      async invalidateChallenge() {},
    },
    getEmailDelivery() {
      return { isConfigured: true, async sendAccountPasswordChangeCode() {} };
    },
  });

  assert.deepEqual(await request(accountId, currentPassword, newPassword), {
    kind: "account_unavailable",
  });
  assert.equal(
    calls.some((call) => call.method === "createChallenge"),
    false,
  );
});

test("request applies database rate limits before replacing an active challenge", async () => {
  const recent = [
    {
      createdAt: new Date(),
      resendAvailableAt: new Date(Date.now() + 25_000),
    },
  ];
  const { repository, calls } = createRequestRepository({
    recentChallenges: recent,
  });
  const request = createRequestPasswordChange({
    repository,
    security: {
      async verifyCurrentPassword() {
        return {
          kind: "verified",
          email: currentAccount.email,
          displayName: currentAccount.displayName,
          passwordHash: currentPasswordHash,
        };
      },
      async invalidateChallenge() {},
    },
    getEmailDelivery() {
      return { isConfigured: true, async sendAccountPasswordChangeCode() {} };
    },
  });

  const result = await request(accountId, currentPassword, newPassword);

  assert.equal(result.kind, "rate_limited");
  assert.ok(result.waitSeconds > 0);
  assert.equal(
    calls.some((call) => call.method === "createChallenge"),
    false,
  );
});

test("request refuses challenge creation when credentials changed after verification", async () => {
  const { repository, calls } = createRequestRepository({
    owner: { ...currentAccount, passwordHash: "newer-password-hash" },
  });
  const request = createRequestPasswordChange({
    repository,
    security: {
      async verifyCurrentPassword() {
        return {
          kind: "verified",
          email: currentAccount.email,
          displayName: currentAccount.displayName,
          passwordHash: currentPasswordHash,
        };
      },
      async invalidateChallenge() {},
    },
    getEmailDelivery() {
      return { isConfigured: true, async sendAccountPasswordChangeCode() {} };
    },
  });

  assert.deepEqual(await request(accountId, currentPassword, newPassword), {
    kind: "credentials_changed",
  });
  assert.equal(
    calls.some((call) => call.method === "createChallenge"),
    false,
  );
});

test("failed password-change email invalidates the challenge", async () => {
  let invalidated;
  const { repository } = createRequestRepository({
    onCreateChallenge(input) {
      invalidated = input.challengeId;
    },
  });
  const request = createRequestPasswordChange({
    repository,
    security: {
      async verifyCurrentPassword() {
        return {
          kind: "verified",
          email: currentAccount.email,
          displayName: currentAccount.displayName,
          passwordHash: currentPasswordHash,
        };
      },
      async invalidateChallenge(
        receivedChallengeId,
        receivedAccountId,
        purpose,
      ) {
        assert.equal(receivedAccountId, accountId);
        assert.equal(purpose, "account_password_change");
        assert.equal(receivedChallengeId, invalidated);
      },
    },
    getEmailDelivery() {
      return {
        isConfigured: true,
        async sendAccountPasswordChangeCode() {
          throw new Error("Provider details must not escape.");
        },
      };
    },
  });

  assert.deepEqual(await request(accountId, currentPassword, newPassword), {
    kind: "delivery_failed",
  });
  assert.ok(invalidated);
});

test("confirmation updates password and revokes sessions, devices, and challenges atomically", async () => {
  const challenge = validChallenge();
  const { repository, calls } = createConfirmationRepository({
    defaultChallenge: challenge,
  });
  const confirm = createConfirmPasswordChange(repository);

  assert.deepEqual(await confirm(accountId, challengeId, "123456"), {
    kind: "updated",
  });
  const orderedCalls = calls
    .filter((call) => call.method !== "withTransaction")
    .map((call) => call.method);
  assert.deepEqual(orderedCalls, [
    "lockOwner",
    "lockChallenge",
    "consumeChallenge",
    "updatePasswordCredential",
    "revokeSessions",
    "revokeTrustedDevices",
    "consumeRelatedChallenges",
  ]);
  const credentialUpdate = calls.find(
    (call) => call.method === "updatePasswordCredential",
  );
  assert.equal(credentialUpdate.input.accountId, accountId);
  assert.equal(credentialUpdate.input.basePasswordHash, currentPasswordHash);
  assert.equal(
    credentialUpdate.input.pendingPasswordHash,
    challenge.pendingPasswordHash,
  );
  assert.equal(
    credentialUpdate.input.passwordPolicyVersion,
    PASSWORD_POLICY_VERSION,
  );
});

test("incorrect confirmation increments attempts and clears staged hashes on the last attempt", async () => {
  const challenge = validChallenge(
    "123456",
    MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS - 1,
  );
  const { repository, calls } = createConfirmationRepository({
    defaultChallenge: challenge,
  });
  const result = await createConfirmPasswordChange(repository)(
    accountId,
    challengeId,
    "654321",
  );

  assert.equal(result.kind, "invalid");
  assert.deepEqual(
    calls.find((call) => call.method === "recordInvalidAttempt").input,
    { challengeId, clearPasswordMaterial: true },
  );
  assert.equal(
    calls.some((call) => call.method === "consumeChallenge"),
    false,
  );
  assert.equal(
    calls.some((call) => call.method === "revokeSessions"),
    false,
  );
});

test("incorrect confirmation below the attempt limit retains staged hashes", async () => {
  const challenge = validChallenge("123456", 1);
  const { repository, calls } = createConfirmationRepository({
    defaultChallenge: challenge,
  });
  const result = await createConfirmPasswordChange(repository)(
    accountId,
    challengeId,
    "654321",
  );

  assert.equal(result.kind, "invalid");
  assert.deepEqual(
    calls.find((call) => call.method === "recordInvalidAttempt").input,
    { challengeId, clearPasswordMaterial: false },
  );
});

test("invalid or unavailable challenge cannot change credentials", async () => {
  const { repository, calls } = createConfirmationRepository({
    challenge: null,
  });
  const result = await createConfirmPasswordChange(repository)(
    accountId,
    challengeId,
    "123456",
  );

  assert.equal(result.kind, "invalid");
  assert.equal(
    calls.some((call) => call.method === "updatePasswordCredential"),
    false,
  );
  assert.equal(
    calls.some((call) => call.method === "revokeSessions"),
    false,
  );
});

test("confirmation does not update credentials when challenge consumption loses a race", async () => {
  const challenge = validChallenge();
  const { repository, calls } = createConfirmationRepository({
    defaultChallenge: challenge,
    consumeChallenge: false,
  });
  const result = await createConfirmPasswordChange(repository)(
    accountId,
    challengeId,
    "123456",
  );

  assert.equal(result.kind, "invalid");
  assert.equal(
    calls.some((call) => call.method === "updatePasswordCredential"),
    false,
  );
  assert.equal(
    calls.some((call) => call.method === "revokeSessions"),
    false,
  );
});

test("changed credentials clear consumed staged password hashes without revoking current access", async () => {
  const challenge = validChallenge();
  const { repository, calls } = createConfirmationRepository({
    defaultChallenge: challenge,
    credentialUpdated: false,
  });
  const result = await createConfirmPasswordChange(repository)(
    accountId,
    challengeId,
    "123456",
  );

  assert.deepEqual(result, { kind: "credentials_changed" });
  assert.ok(
    calls.some(
      (call) =>
        call.method === "clearChallengePasswordMaterial" &&
        call.challengeId === challengeId,
    ),
  );
  assert.equal(
    calls.some((call) => call.method === "revokeSessions"),
    false,
  );
});
