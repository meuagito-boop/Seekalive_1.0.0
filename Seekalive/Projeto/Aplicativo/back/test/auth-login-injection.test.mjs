import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import argon2 from "argon2";
import test from "node:test";
import { PASSWORD_POLICY_VERSION } from "@workspace/api-zod";
import { hashToken } from "../src/security/tokenHashing.ts";
import { createAuthenticateLogin } from "../src/modules/auth/application/login/authenticateLogin.ts";
import { createStartDeviceVerification } from "../src/modules/auth/application/login/startDeviceVerification.ts";

const loginApplicationDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/modules/auth/application/login",
);
const validPassword = "Valid!Password2026";
const rawDeviceToken = "d".repeat(43);
const account = {
  id: "account-1",
  username: "demo.user",
  displayName: "Demo User",
  accountType: "personal",
  accountStatus: "active",
  securityLockedAt: null,
  onboardingCompletedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  email: "demo@example.com",
  emailVerifiedAt: new Date("2026-01-02T00:00:00.000Z"),
  passwordHash: "",
  passwordPolicyVersion: PASSWORD_POLICY_VERSION,
};

const loginAccount = {
  ...account,
  passwordHash: await argon2.hash(validPassword),
};

function createRepository(row = loginAccount, overrides = {}) {
  const calls = [];
  const repository = {
    async findLoginAccount(input) {
      calls.push({ method: "findLoginAccount", input });
      return overrides.findLoginAccount
        ? overrides.findLoginAccount(input, row)
        : row;
    },
    async withTransaction(operation) {
      calls.push({ method: "withTransaction" });
      return operation({
        async lockAccountForAuthentication(accountId) {
          calls.push({ method: "lockAccountForAuthentication", accountId });
          return (
            overrides.currentAccount ?? {
              status: row.accountStatus,
              verifiedAt: row.emailVerifiedAt,
              securityLockedAt: row.securityLockedAt,
            }
          );
        },
        async lockPasswordCredential(accountId) {
          calls.push({ method: "lockPasswordCredential", accountId });
          return (
            overrides.credential ?? {
              passwordHash: row.passwordHash,
              passwordPolicyVersion: row.passwordPolicyVersion,
            }
          );
        },
        async updatePasswordPolicyVersion(accountId, policyVersion) {
          calls.push({
            method: "updatePasswordPolicyVersion",
            accountId,
            policyVersion,
          });
        },
        async lockTrustedDevice(accountId, tokenHash) {
          calls.push({ method: "lockTrustedDevice", accountId, tokenHash });
          return overrides.device === undefined
            ? { id: "trusted-device-1" }
            : overrides.device;
        },
        async updateTrustedDeviceLastSeen(deviceId, now) {
          calls.push({ method: "updateTrustedDeviceLastSeen", deviceId, now });
        },
        async createSession(input) {
          calls.push({ method: "createSession", input });
          return overrides.session === undefined
            ? {
                id: "session-1",
                createdAt: input.material.createdAt,
                expiresAt: input.material.expiresAt,
              }
            : overrides.session;
        },
      });
    },
  };
  return { repository, calls };
}

test("login application has no direct database or infrastructure imports", async () => {
  const files = await readdir(loginApplicationDirectory);
  assert.ok(files.length > 0);

  for (const file of files.filter((name) => name.endsWith(".ts"))) {
    const source = await readFile(
      path.join(loginApplicationDirectory, file),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /(?:from\s*|import\s*\()\s*["'](?:@workspace\/db|drizzle-orm|..\/..\/infrastructure)(?:\/[^"']*)?["']/,
      `${file} must depend on application ports rather than database or infrastructure modules.`,
    );
  }
});

test("login normalizes username identifiers and creates session only for a trusted device", async () => {
  const { repository, calls } = createRepository();
  const authenticate = createAuthenticateLogin(repository);

  const result = await authenticate(
    "  @DEMO.USER ",
    validPassword,
    rawDeviceToken,
  );

  assert.equal(result.kind, "authenticated");
  assert.equal(result.account.id, account.id);
  assert.equal(result.session.id, "session-1");
  assert.equal(result.deviceToken, rawDeviceToken);
  assert.deepEqual(calls[0], {
    method: "findLoginAccount",
    input: { identifier: "demo.user", kind: "username" },
  });
  assert.equal(
    calls.find((call) => call.method === "lockTrustedDevice").tokenHash,
    hashToken(rawDeviceToken),
  );
  assert.equal(
    calls.some((call) => call.method === "createSession"),
    true,
  );
});

test("login normalizes email identifiers before the repository lookup", async () => {
  const { repository, calls } = createRepository();
  const authenticate = createAuthenticateLogin(repository);

  await authenticate("  DEMO@EXAMPLE.COM ", validPassword, rawDeviceToken);

  assert.deepEqual(calls[0], {
    method: "findLoginAccount",
    input: { identifier: "demo@example.com", kind: "email" },
  });
});

test("missing account and incorrect password use the same invalid-credentials result", async () => {
  const missingRepository = createRepository(null).repository;
  const authenticateMissing = createAuthenticateLogin(missingRepository);
  const missing = await authenticateMissing(
    "missing@example.com",
    validPassword,
    rawDeviceToken,
  );
  assert.deepEqual(missing, { kind: "invalid_credentials" });

  const wrongPassword = await createAuthenticateLogin(
    createRepository().repository,
  )("demo.user", "Wrong!Password2026", rawDeviceToken);
  assert.deepEqual(wrongPassword, { kind: "invalid_credentials" });
});

test("unverified account cannot enter and does not start a transaction", async () => {
  const row = {
    ...loginAccount,
    accountStatus: "pending_verification",
    emailVerifiedAt: null,
  };
  const { repository, calls } = createRepository(row);
  const authenticate = createAuthenticateLogin(repository);

  assert.deepEqual(
    await authenticate("demo.user", validPassword, rawDeviceToken),
    { kind: "email_not_verified" },
  );
  assert.equal(
    calls.some((call) => call.method === "withTransaction"),
    false,
  );
});

test("locked or inactive account cannot create a session", async () => {
  for (const [accountPatch, expected] of [
    [{ accountStatus: "disabled" }, { kind: "account_unavailable" }],
    [{ securityLockedAt: new Date() }, { kind: "account_locked" }],
  ]) {
    const { repository, calls } = createRepository({
      ...loginAccount,
      ...accountPatch,
    });
    const authenticate = createAuthenticateLogin(repository);

    assert.deepEqual(
      await authenticate("demo.user", validPassword, rawDeviceToken),
      expected,
    );
    assert.equal(
      calls.some((call) => call.method === "withTransaction"),
      false,
    );
  }
});

test("transaction rechecks account state and credential freshness", async () => {
  const cases = [
    {
      currentAccount: {
        status: "disabled",
        verifiedAt: account.emailVerifiedAt,
        securityLockedAt: null,
      },
      expected: { kind: "account_unavailable" },
    },
    {
      currentAccount: {
        status: "active",
        verifiedAt: null,
        securityLockedAt: null,
      },
      expected: { kind: "email_not_verified" },
    },
    {
      credential: {
        passwordHash: "a newer password hash",
        passwordPolicyVersion: PASSWORD_POLICY_VERSION,
      },
      expected: { kind: "credentials_changed" },
    },
  ];

  for (const { currentAccount, credential, expected } of cases) {
    const { repository, calls } = createRepository(loginAccount, {
      currentAccount,
      credential,
    });
    const result = await createAuthenticateLogin(repository)(
      "demo.user",
      validPassword,
      rawDeviceToken,
    );
    assert.deepEqual(result, expected);
    assert.equal(
      calls.some((call) => call.method === "createSession"),
      false,
    );
  }
});

test("password-policy mismatch is surfaced and policy version advances only after validation", async () => {
  const olderVersion = PASSWORD_POLICY_VERSION - 1;
  const legacyAccount = {
    ...loginAccount,
    passwordPolicyVersion: olderVersion,
  };

  const staleCredential = createRepository(legacyAccount, {
    credential: {
      passwordHash: legacyAccount.passwordHash,
      passwordPolicyVersion: PASSWORD_POLICY_VERSION + 1,
    },
  }).repository;
  assert.deepEqual(
    await createAuthenticateLogin(staleCredential)(
      "demo.user",
      validPassword,
      rawDeviceToken,
    ),
    { kind: "unsupported_policy" },
  );

  const legacyPassword = "weak-password";
  const legacyAccountWithWeakPassword = {
    ...legacyAccount,
    passwordHash: await argon2.hash(legacyPassword),
  };
  const updateRequired = createRepository(
    legacyAccountWithWeakPassword,
  ).repository;
  assert.deepEqual(
    await createAuthenticateLogin(updateRequired)(
      "demo.user",
      legacyPassword,
      rawDeviceToken,
    ),
    { kind: "password_update_required" },
  );

  const { repository, calls } = createRepository(legacyAccount);
  const upgraded = await createAuthenticateLogin(repository)(
    "demo.user",
    validPassword,
    rawDeviceToken,
  );
  assert.equal(upgraded.kind, "authenticated");
  assert.ok(
    calls.some(
      (call) =>
        call.method === "updatePasswordPolicyVersion" &&
        call.policyVersion === PASSWORD_POLICY_VERSION,
    ),
  );
});

test("unknown device creates no session and returns an explicit verification outcome", async () => {
  const { repository, calls } = createRepository(loginAccount, {
    device: null,
  });
  const result = await createAuthenticateLogin(repository)(
    "demo.user",
    validPassword,
    rawDeviceToken,
  );

  assert.deepEqual(result, { kind: "unknown_device", account: loginAccount });
  assert.equal(
    calls.some((call) => call.method === "createSession"),
    false,
  );
});

test("device-verification start returns only public challenge metadata", async () => {
  let persistedDeviceHash;
  let sentMessage;
  const start = createStartDeviceVerification({
    async createChallenge(accountId, deviceTokenHash) {
      assert.equal(accountId, "account-1");
      persistedDeviceHash = deviceTokenHash;
      return {
        challengeId: "challenge-1",
        code: "123456",
        email: "demo@example.com",
        emailMasked: "d***@example.com",
        displayName: "Demo User",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 600_000),
        resendAvailableAt: new Date(Date.now() + 30_000),
      };
    },
    async invalidateChallenge() {
      assert.fail(
        "Successful email delivery must not invalidate the challenge.",
      );
    },
    getEmailDelivery() {
      return {
        isConfigured: true,
        async sendDeviceLoginCode(message) {
          sentMessage = message;
        },
      };
    },
  });

  const result = await start("account-1");

  assert.equal(result.kind, "challenge_created");
  assert.equal(result.rawDeviceToken.length, 43);
  assert.equal(persistedDeviceHash, hashToken(result.rawDeviceToken));
  assert.deepEqual(sentMessage, {
    email: "demo@example.com",
    displayName: "Demo User",
    code: "123456",
  });
  assert.deepEqual(Object.keys(result.challenge).sort(), [
    "challengeId",
    "emailMasked",
    "expiresAt",
    "resendAvailableAt",
  ]);
  assert.equal(JSON.stringify(result).includes("123456"), false);
  assert.equal(JSON.stringify(result).includes("demo@example.com"), false);
});

test("device-verification does not create a challenge when delivery is unconfigured", async () => {
  let createdChallenge = false;
  const start = createStartDeviceVerification({
    async createChallenge() {
      createdChallenge = true;
      return null;
    },
    async invalidateChallenge() {},
    getEmailDelivery() {
      return {
        isConfigured: false,
        async sendDeviceLoginCode() {
          assert.fail("Unconfigured delivery must not be called.");
        },
      };
    },
  });

  assert.deepEqual(await start("account-1"), { kind: "delivery_unavailable" });
  assert.equal(createdChallenge, false);
});

test("failed device-verification delivery invalidates the created challenge", async () => {
  let invalidatedChallengeId;
  const start = createStartDeviceVerification({
    async createChallenge() {
      return {
        challengeId: "challenge-failed",
        code: "654321",
        email: "demo@example.com",
        emailMasked: "d***@example.com",
        displayName: "Demo User",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 600_000),
        resendAvailableAt: new Date(Date.now() + 30_000),
      };
    },
    async invalidateChallenge(challengeId) {
      invalidatedChallengeId = challengeId;
    },
    getEmailDelivery() {
      return {
        isConfigured: true,
        async sendDeviceLoginCode() {
          throw new Error("provider response must not escape");
        },
      };
    },
  });

  assert.deepEqual(await start("account-1"), { kind: "delivery_failed" });
  assert.equal(invalidatedChallengeId, "challenge-failed");
});
