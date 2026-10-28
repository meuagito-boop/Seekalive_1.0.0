import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const passwordResetDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/modules/auth/application/passwordReset",
);
const [
  { createRequestPasswordReset },
  { createConfirmPasswordReset },
  { hashPasswordResetCode },
] = await Promise.all([
  import("../src/modules/auth/application/passwordReset/requestPasswordReset.ts"),
  import("../src/modules/auth/application/passwordReset/confirmPasswordReset.ts"),
  import("../src/security/tokenHashing.ts"),
]);

const account = {
  id: "account-1",
  status: "active",
  securityLockedAt: null,
  emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  passwordHash: "current-password-hash",
};
const resetCode = "123456";

function createConfirmationHarness(overrides = {}) {
  const calls = [];
  const challenge = {
    id: "challenge-1",
    tokenHash: hashPasswordResetCode(account.id, resetCode),
  };
  const behavior = {
    account,
    challenge,
    ownerLocked: true,
    challengeConsumed: true,
    credentialUpdated: true,
    passwordReused: false,
    ...overrides,
  };
  const repository = {
    async findAccountByEmail(email) {
      calls.push(["findAccountByEmail", email]);
      return behavior.account;
    },
    async findActiveChallenge(input) {
      calls.push(["findActiveChallenge", input]);
      return behavior.challenge;
    },
    async recordInvalidAttempt(input) {
      calls.push(["recordInvalidAttempt", input]);
    },
    async withTransaction(operation) {
      calls.push(["transactionStarted"]);
      const result = await operation({
        async lockOwner(accountId) {
          calls.push(["lockOwner", accountId]);
          return behavior.ownerLocked;
        },
        async consumeChallenge(input) {
          calls.push(["consumeChallenge", input]);
          return behavior.challengeConsumed;
        },
        async updatePasswordCredential(input) {
          calls.push(["updatePasswordCredential", input]);
          return behavior.credentialUpdated;
        },
        async revokeSessions(accountId, now) {
          calls.push(["revokeSessions", accountId, now]);
        },
        async revokeTrustedDevices(accountId, now) {
          calls.push(["revokeTrustedDevices", accountId, now]);
        },
        async consumeRelatedChallenges(accountId, now) {
          calls.push(["consumeRelatedChallenges", accountId, now]);
        },
      });
      calls.push(["transactionCommitted"]);
      return result;
    },
  };
  const passwordSecurity = {
    async verifyPasswordHash() {
      return behavior.passwordReused;
    },
    async hashPassword() {
      calls.push(["hashPassword"]);
      return "new-password-hash";
    },
  };

  return {
    calls,
    confirm: createConfirmPasswordReset(repository, passwordSecurity),
  };
}

test("password-reset application files do not import database packages", async () => {
  const files = await readdir(passwordResetDirectory);
  for (const file of files.filter((name) => name.endsWith(".ts"))) {
    const source = await readFile(
      path.join(passwordResetDirectory, file),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /(?:from\s*|import\s*\()\s*["'](?:@workspace\/db|drizzle-orm)(?:\/[^"']*)?["']/,
      `${file} must not import database packages.`,
    );
  }
});

test("password-reset request does not create challenges for unavailable accounts", async () => {
  const cases = [
    { ...account, status: "pending" },
    { ...account, emailVerifiedAt: null },
    { ...account, securityLockedAt: new Date("2026-01-02T00:00:00.000Z") },
    null,
  ];

  for (const requestAccount of cases) {
    const calls = [];
    const request = createRequestPasswordReset({
      repository: {
        async findAccountByEmail(email) {
          calls.push(["findAccountByEmail", email]);
          return requestAccount;
        },
      },
      async createChallenge() {
        calls.push(["createChallenge"]);
        return { code: resetCode, tokenHash: "challenge-hash" };
      },
      async invalidateChallenge() {
        calls.push(["invalidateChallenge"]);
      },
      logger: { warn() {}, error() {} },
    });

    await request("person@example.com", {
      async sendPasswordResetCode() {
        calls.push(["sendPasswordResetCode"]);
      },
    });
    assert.deepEqual(calls, [["findAccountByEmail", "person@example.com"]]);
  }
});

test("password-reset request invalidates a challenge if email delivery fails", async () => {
  const calls = [];
  const loggerEvents = [];
  const request = createRequestPasswordReset({
    repository: {
      async findAccountByEmail() {
        return account;
      },
    },
    async createChallenge(accountId) {
      calls.push(["createChallenge", accountId]);
      return { code: resetCode, tokenHash: "challenge-hash" };
    },
    async invalidateChallenge(accountId, tokenHash) {
      calls.push(["invalidateChallenge", accountId, tokenHash]);
      throw new Error("repository unavailable");
    },
    logger: {
      warn(fields) {
        loggerEvents.push(["warn", fields.code]);
      },
      error(fields) {
        loggerEvents.push(["error", fields.code]);
      },
    },
  });

  let rejectDelivery;
  await request("person@example.com", {
    sendPasswordResetCode() {
      return new Promise((_, reject) => {
        rejectDelivery = reject;
      });
    },
  });
  rejectDelivery(new Error("mail provider unavailable"));
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(calls, [
    ["createChallenge", account.id],
    ["invalidateChallenge", account.id, "challenge-hash"],
  ]);
  assert.deepEqual(loggerEvents, [
    ["warn", "PASSWORD_RESET_EMAIL_FAILED"],
    ["error", "PASSWORD_RESET_CHALLENGE_INVALIDATION_FAILED"],
  ]);
});

test("password-reset confirmation rejects unknown and locked accounts", async () => {
  const unknown = createConfirmationHarness({ account: null });
  assert.deepEqual(
    await unknown.confirm("unknown@example.com", resetCode, "new-password"),
    { kind: "invalid" },
  );
  assert.equal(
    unknown.calls.some(([name]) => name === "findActiveChallenge"),
    false,
  );

  const locked = createConfirmationHarness({
    account: {
      ...account,
      securityLockedAt: new Date("2026-01-02T00:00:00.000Z"),
    },
  });
  assert.deepEqual(
    await locked.confirm("person@example.com", resetCode, "new-password"),
    { kind: "locked" },
  );
  assert.equal(
    locked.calls.some(([name]) => name === "findActiveChallenge"),
    false,
  );
});

test("wrong password-reset code records one bounded attempt", async () => {
  const harness = createConfirmationHarness();
  assert.deepEqual(
    await harness.confirm("person@example.com", "654321", "new-password"),
    { kind: "invalid" },
  );
  const attempt = harness.calls.find(
    ([name]) => name === "recordInvalidAttempt",
  );
  assert.equal(attempt[1].challengeId, "challenge-1");
  assert.equal(attempt[1].maxAttempts, 5);
  assert.equal(
    harness.calls.some(([name]) => name === "transactionStarted"),
    false,
  );
});

test("password-reset confirmation rejects reuse without changing credentials", async () => {
  const harness = createConfirmationHarness({ passwordReused: true });
  assert.deepEqual(
    await harness.confirm("person@example.com", resetCode, "current-password"),
    { kind: "password_reuse" },
  );
  assert.equal(
    harness.calls.some(([name]) => name === "transactionStarted"),
    false,
  );
});

test("successful password reset consumes the challenge and revokes account access", async () => {
  const harness = createConfirmationHarness();
  assert.deepEqual(
    await harness.confirm("person@example.com", resetCode, "new-password"),
    { kind: "updated" },
  );
  assert.deepEqual(
    harness.calls
      .filter(([name]) =>
        [
          "lockOwner",
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
      "consumeChallenge",
      "updatePasswordCredential",
      "revokeSessions",
      "revokeTrustedDevices",
      "consumeRelatedChallenges",
      "transactionCommitted",
    ],
  );
  const updatedCredential = harness.calls.find(
    ([name]) => name === "updatePasswordCredential",
  );
  assert.equal(updatedCredential[1].currentPasswordHash, account.passwordHash);
  assert.equal(updatedCredential[1].newPasswordHash, "new-password-hash");
});

test("credential conflict commits challenge consumption and reports credentials_changed", async () => {
  const harness = createConfirmationHarness({ credentialUpdated: false });
  assert.deepEqual(
    await harness.confirm("person@example.com", resetCode, "new-password"),
    { kind: "credentials_changed" },
  );
  assert.equal(
    harness.calls.some(([name]) => name === "consumeChallenge"),
    true,
  );
  assert.equal(
    harness.calls.some(([name]) => name === "transactionCommitted"),
    true,
  );
  assert.equal(
    harness.calls.some(([name]) => name === "revokeSessions"),
    false,
  );
});

test("a challenge consumed concurrently cannot update the password", async () => {
  const harness = createConfirmationHarness({ challengeConsumed: false });
  assert.deepEqual(
    await harness.confirm("person@example.com", resetCode, "new-password"),
    { kind: "invalid" },
  );
  assert.equal(
    harness.calls.some(([name]) => name === "updatePasswordCredential"),
    false,
  );
});
