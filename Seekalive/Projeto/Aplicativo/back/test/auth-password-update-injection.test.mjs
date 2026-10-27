import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { PASSWORD_POLICY_VERSION } from "@workspace/api-zod";
import { hashPasswordUpdateCode } from "../src/security/session.ts";
import { MAX_PASSWORD_UPDATE_ATTEMPTS } from "../src/modules/auth/application/challenges/passwordUpdate.ts";
import { createConfirmPasswordUpdate } from "../src/modules/auth/application/passwordUpdate/confirmPasswordUpdate.ts";
import { createRequestPasswordUpdate } from "../src/modules/auth/application/passwordUpdate/requestPasswordUpdate.ts";

const applicationDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/modules/auth/application/passwordUpdate",
);
const accountId = "account-password-update";
const challengeId = "challenge-password-update";
const currentPassword = "Current!Password2026";
const newPassword = "New!Password2026";
const currentAccount = {
  id: accountId,
  status: "active",
  securityLockedAt: null,
  emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  email: "person@example.com",
  displayName: "Person",
  passwordHash: "current-password-hash",
};

function createRequestHarness(overrides = {}) {
  const calls = [];
  const behavior = {
    account: currentAccount,
    currentPasswordValid: true,
    passwordReused: false,
    challenge: {
      challengeId,
      code: "123456",
      email: currentAccount.email,
      emailMasked: "pe*****@example.com",
      displayName: currentAccount.displayName,
      expiresAt: new Date("2026-01-01T00:10:00.000Z"),
    },
    deliveryConfigured: true,
    deliveryError: null,
    ...overrides,
  };
  const request = createRequestPasswordUpdate({
    repository: {
      async findAccountByIdentifier(identifier) {
        calls.push(["findAccountByIdentifier", identifier]);
        return behavior.account;
      },
    },
    passwordSecurity: {
      async getFallbackPasswordHash() {
        calls.push(["getFallbackPasswordHash"]);
        return "fallback-password-hash";
      },
      async verifyPasswordHash(passwordHash, password) {
        calls.push(["verifyPasswordHash", passwordHash, password]);
        if (passwordHash === "fallback-password-hash") return false;
        if (password === newPassword) return behavior.passwordReused;
        return behavior.currentPasswordValid;
      },
      async hashPassword(password) {
        calls.push(["hashPassword", password]);
        return "pending-password-hash";
      },
    },
    async createChallenge(receivedAccountId, pendingHash, baseHash) {
      calls.push(["createChallenge", receivedAccountId, pendingHash, baseHash]);
      return behavior.challenge;
    },
    async invalidateChallenge(receivedChallengeId) {
      calls.push(["invalidateChallenge", receivedChallengeId]);
    },
    logger: {
      warn(fields) {
        calls.push(["warn", fields.code]);
      },
    },
  });
  const delivery = {
    isConfigured: behavior.deliveryConfigured,
    async sendPasswordUpdateCode(message) {
      calls.push(["sendPasswordUpdateCode", message]);
      if (behavior.deliveryError) throw behavior.deliveryError;
    },
  };

  return { request, delivery, calls };
}

function createConfirmationHarness(overrides = {}) {
  const calls = [];
  const behavior = {
    owner: {
      status: "active",
      securityLockedAt: null,
      emailVerifiedAt: currentAccount.emailVerifiedAt,
    },
    challenge: validChallenge(),
    challengeConsumed: true,
    credentialUpdated: true,
    ...overrides,
  };
  const repository = {
    async findChallengeOwner(receivedChallengeId) {
      calls.push(["findChallengeOwner", receivedChallengeId]);
      return behavior.ownerLookup === null ? null : { accountId };
    },
    async withTransaction(operation) {
      calls.push(["transactionStarted"]);
      const result = await operation({
        async lockOwner(receivedAccountId) {
          calls.push(["lockOwner", receivedAccountId]);
          return behavior.owner;
        },
        async lockChallenge(input) {
          calls.push(["lockChallenge", input]);
          return behavior.challenge;
        },
        async recordInvalidAttempt(input) {
          calls.push(["recordInvalidAttempt", input]);
        },
        async consumeChallenge(input) {
          calls.push(["consumeChallenge", input]);
          return behavior.challengeConsumed;
        },
        async updatePasswordCredential(input) {
          calls.push(["updatePasswordCredential", input]);
          return behavior.credentialUpdated;
        },
        async clearChallengePasswordMaterial(receivedChallengeId) {
          calls.push(["clearChallengePasswordMaterial", receivedChallengeId]);
        },
        async revokeSessions(receivedAccountId) {
          calls.push(["revokeSessions", receivedAccountId]);
        },
        async revokeTrustedDevices(receivedAccountId) {
          calls.push(["revokeTrustedDevices", receivedAccountId]);
        },
        async consumeRelatedChallenges(receivedAccountId) {
          calls.push(["consumeRelatedChallenges", receivedAccountId]);
        },
      });
      calls.push(["transactionCommitted"]);
      return result;
    },
  };

  return { calls, confirm: createConfirmPasswordUpdate(repository) };
}

function validChallenge(code = "123456", attempts = 0) {
  return {
    id: challengeId,
    tokenHash: hashPasswordUpdateCode(accountId, challengeId, code),
    attempts,
    pendingPasswordHash: "pending-password-hash",
    basePasswordHash: currentAccount.passwordHash,
  };
}

test("password-update application modules use ports, not persistence or infrastructure", async () => {
  const files = await readdir(applicationDirectory);
  for (const file of files.filter((name) => name.endsWith(".ts"))) {
    const source = await readFile(
      path.join(applicationDirectory, file),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /(?:from\s*|import\s*\()\s*["'](?:@workspace\/db|drizzle-orm|..\/..\/infrastructure)(?:\/[^"']*)?["']/,
      `${file} must not import persistence or infrastructure packages.`,
    );
  }
});

test("request normalizes an email and sends only after challenge creation", async () => {
  const { request, delivery, calls } = createRequestHarness();
  const result = await request(
    "  PERSON@EXAMPLE.COM ",
    currentPassword,
    newPassword,
    delivery,
  );

  assert.deepEqual(result, {
    kind: "verification_required",
    challengeId,
    emailMasked: "pe*****@example.com",
    expiresAt: new Date("2026-01-01T00:10:00.000Z"),
  });
  assert.deepEqual(
    calls.find(([name]) => name === "findAccountByIdentifier")[1],
    { kind: "email", value: "person@example.com" },
  );
  assert.deepEqual(
    calls.find(([name]) => name === "createChallenge").slice(1),
    [accountId, "pending-password-hash", currentAccount.passwordHash],
  );
  assert.ok(
    calls.findIndex(([name]) => name === "createChallenge") <
      calls.findIndex(([name]) => name === "sendPasswordUpdateCode"),
  );
  assert.equal(JSON.stringify(result).includes("123456"), false);
  assert.equal(JSON.stringify(result).includes(currentAccount.email), false);
});

test("request normalizes a username and verifies a fallback hash for unknown accounts", async () => {
  const existing = createRequestHarness();
  await existing.request(
    "@PERSON_HANDLE",
    currentPassword,
    newPassword,
    existing.delivery,
  );
  assert.deepEqual(
    existing.calls.find(([name]) => name === "findAccountByIdentifier")[1],
    { kind: "username", value: "person_handle" },
  );

  const unknown = createRequestHarness({ account: null });
  assert.deepEqual(
    await unknown.request(
      "unknown@example.com",
      currentPassword,
      newPassword,
      unknown.delivery,
    ),
    { kind: "invalid_credentials" },
  );
  assert.ok(
    unknown.calls.some(
      ([name, hash]) =>
        name === "verifyPasswordHash" && hash === "fallback-password-hash",
    ),
  );
  assert.equal(
    unknown.calls.some(([name]) => name === "createChallenge"),
    false,
  );
});

test("request refuses unverified, unavailable, locked, and reused-password cases", async () => {
  const cases = [
    {
      overrides: {
        account: { ...currentAccount, status: "pending_verification" },
      },
      result: "email_not_verified",
    },
    {
      overrides: { account: { ...currentAccount, status: "disabled" } },
      result: "account_unavailable",
    },
    {
      overrides: {
        account: {
          ...currentAccount,
          securityLockedAt: new Date("2026-01-02T00:00:00.000Z"),
        },
      },
      result: "locked",
    },
    { overrides: { passwordReused: true }, result: "password_reuse" },
  ];

  for (const { overrides, result } of cases) {
    const harness = createRequestHarness(overrides);
    assert.deepEqual(
      await harness.request(
        currentAccount.email,
        currentPassword,
        newPassword,
        harness.delivery,
      ),
      { kind: result },
    );
    assert.equal(
      harness.calls.some(([name]) => name === "createChallenge"),
      false,
    );
  }
});

test("request does not create a challenge when delivery is not configured", async () => {
  const harness = createRequestHarness({ deliveryConfigured: false });
  assert.deepEqual(
    await harness.request(
      currentAccount.email,
      currentPassword,
      newPassword,
      harness.delivery,
    ),
    { kind: "delivery_unavailable" },
  );
  assert.equal(
    harness.calls.some(([name]) => name === "createChallenge"),
    false,
  );
});

test("request invalidates the challenge when email delivery fails", async () => {
  const harness = createRequestHarness({
    deliveryError: new Error("provider detail must not escape"),
  });
  assert.deepEqual(
    await harness.request(
      currentAccount.email,
      currentPassword,
      newPassword,
      harness.delivery,
    ),
    { kind: "delivery_failed" },
  );
  assert.ok(
    harness.calls.some(
      ([name, receivedId]) =>
        name === "invalidateChallenge" && receivedId === challengeId,
    ),
  );
  assert.ok(
    harness.calls.some(
      ([name, code]) =>
        name === "warn" && code === "PASSWORD_UPDATE_EMAIL_FAILED",
    ),
  );
});

test("request reports stale credentials when challenge creation loses the credential race", async () => {
  const harness = createRequestHarness({ challenge: null });
  assert.deepEqual(
    await harness.request(
      currentAccount.email,
      currentPassword,
      newPassword,
      harness.delivery,
    ),
    { kind: "credentials_changed" },
  );
});

test("confirmation consumes the code, changes credentials, and revokes access atomically", async () => {
  const harness = createConfirmationHarness();
  assert.deepEqual(await harness.confirm(challengeId, "123456"), {
    kind: "updated",
  });
  assert.deepEqual(
    harness.calls
      .filter(([name]) =>
        [
          "lockOwner",
          "lockChallenge",
          "recordInvalidAttempt",
          "consumeChallenge",
          "updatePasswordCredential",
          "revokeSessions",
          "revokeTrustedDevices",
          "consumeRelatedChallenges",
          "transactionCommitted",
        ].includes(name),
      )
      .map(([name]) => name),
    [
      "lockOwner",
      "lockChallenge",
      "consumeChallenge",
      "updatePasswordCredential",
      "revokeSessions",
      "revokeTrustedDevices",
      "consumeRelatedChallenges",
      "transactionCommitted",
    ],
  );
  const credentialUpdate = harness.calls.find(
    ([name]) => name === "updatePasswordCredential",
  )[1];
  assert.equal(credentialUpdate.pendingPasswordHash, "pending-password-hash");
  assert.equal(credentialUpdate.basePasswordHash, currentAccount.passwordHash);
  assert.equal(credentialUpdate.passwordPolicyVersion, PASSWORD_POLICY_VERSION);
});

test("the last incorrect code clears pending password hashes", async () => {
  const harness = createConfirmationHarness({
    challenge: validChallenge("123456", MAX_PASSWORD_UPDATE_ATTEMPTS - 1),
  });
  assert.deepEqual(await harness.confirm(challengeId, "654321"), {
    kind: "invalid",
  });
  assert.deepEqual(
    harness.calls.find(([name]) => name === "recordInvalidAttempt")[1],
    { challengeId, clearPasswordMaterial: true },
  );
  assert.equal(
    harness.calls.some(([name]) => name === "consumeChallenge"),
    false,
  );
});

test("wrong codes below the attempt limit retain staged hashes for another attempt", async () => {
  const harness = createConfirmationHarness({
    challenge: validChallenge("123456", 1),
  });
  assert.deepEqual(await harness.confirm(challengeId, "654321"), {
    kind: "invalid",
  });
  assert.deepEqual(
    harness.calls.find(([name]) => name === "recordInvalidAttempt")[1],
    { challengeId, clearPasswordMaterial: false },
  );
});

test("missing owner, locked owner, or unavailable challenge cannot change credentials", async () => {
  const missing = createConfirmationHarness({ ownerLookup: null });
  assert.deepEqual(await missing.confirm(challengeId, "123456"), {
    kind: "invalid",
  });
  assert.equal(
    missing.calls.some(([name]) => name === "transactionStarted"),
    false,
  );

  const locked = createConfirmationHarness({
    owner: {
      status: "active",
      securityLockedAt: new Date("2026-01-02T00:00:00.000Z"),
      emailVerifiedAt: currentAccount.emailVerifiedAt,
    },
  });
  assert.deepEqual(await locked.confirm(challengeId, "123456"), {
    kind: "locked",
  });
  assert.equal(
    locked.calls.some(([name]) => name === "lockChallenge"),
    false,
  );

  const unavailable = createConfirmationHarness({ challenge: null });
  assert.deepEqual(await unavailable.confirm(challengeId, "123456"), {
    kind: "invalid",
  });
  assert.equal(
    unavailable.calls.some(([name]) => name === "updatePasswordCredential"),
    false,
  );
});

test("credential conflict consumes staged hashes without revoking current access", async () => {
  const harness = createConfirmationHarness({ credentialUpdated: false });
  assert.deepEqual(await harness.confirm(challengeId, "123456"), {
    kind: "credentials_changed",
  });
  assert.ok(
    harness.calls.some(
      ([name, receivedId]) =>
        name === "clearChallengePasswordMaterial" && receivedId === challengeId,
    ),
  );
  assert.ok(harness.calls.some(([name]) => name === "transactionCommitted"));
  assert.equal(
    harness.calls.some(([name]) => name === "revokeSessions"),
    false,
  );
});

test("a concurrent challenge consumption prevents credential changes", async () => {
  const harness = createConfirmationHarness({ challengeConsumed: false });
  assert.deepEqual(await harness.confirm(challengeId, "123456"), {
    kind: "invalid",
  });
  assert.equal(
    harness.calls.some(([name]) => name === "updatePasswordCredential"),
    false,
  );
});
