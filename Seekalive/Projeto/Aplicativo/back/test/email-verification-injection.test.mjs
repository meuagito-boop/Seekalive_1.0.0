import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { PASSWORD_POLICY_VERSION } from "@workspace/api-zod";
import { hashVerificationCode } from "../src/security/tokenHashing.ts";
import { createConfirmEmailVerification } from "../src/modules/auth/application/emailVerification/confirmEmailVerification.ts";
import { VerificationDeliveryUnavailableError } from "../src/modules/auth/application/emailVerification/errors.ts";
import { createRequestEmailVerification } from "../src/modules/auth/application/emailVerification/requestEmailVerification.ts";
import { createSendVerificationCode } from "../src/modules/auth/application/emailVerification/sendVerificationCode.ts";

const applicationDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/modules/auth/application/emailVerification",
);
const account = {
  id: "account-1",
  username: "sample_user",
  displayName: "Sample User",
  accountType: "personal",
  status: "pending_verification",
  onboardingCompletedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  verifiedAt: null,
  passwordPolicyVersion: PASSWORD_POLICY_VERSION,
};

function makeRepository(overrides = {}) {
  const calls = [];
  const transaction = {
    async lockLatestChallenge() {
      calls.push("lockLatestChallenge");
      return overrides.challenge ?? null;
    },
    async recordInvalidAttempt(input) {
      calls.push(["recordInvalidAttempt", input]);
    },
    async consumeChallenge() {
      calls.push("consumeChallenge");
      return overrides.consumeChallenge ?? true;
    },
    async verifyEmail() {
      calls.push("verifyEmail");
      return overrides.verifyEmail ?? true;
    },
    async activateAccount() {
      calls.push("activateAccount");
      return overrides.activateAccount ?? true;
    },
    async createTrustedDevice(input) {
      calls.push(["createTrustedDevice", input]);
      return overrides.deviceId ?? "device-1";
    },
    async createSession(input) {
      calls.push(["createSession", input]);
      return {
        id: "session-1",
        createdAt: input.material.createdAt,
        expiresAt: input.material.expiresAt,
      };
    },
  };

  return {
    calls,
    async findResendAccountByEmail(email) {
      calls.push(["findResendAccountByEmail", email]);
      return overrides.resendAccount ?? null;
    },
    async findConfirmationAccountByEmail(email) {
      calls.push(["findConfirmationAccountByEmail", email]);
      return overrides.confirmationAccount ?? account;
    },
    async replaceChallenge(input) {
      calls.push(["replaceChallenge", input]);
      overrides.onReplaceChallenge?.(input);
    },
    async withTransaction(operation) {
      calls.push("withTransaction");
      return operation(transaction);
    },
  };
}

function createDelivery(overrides = {}) {
  return {
    isConfigured: overrides.isConfigured ?? true,
    async sendVerificationCode(input) {
      overrides.onSend?.(input);
    },
  };
}

test("email-verification application modules do not import persistence packages", async () => {
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

test("sending a verification code replaces active challenges and stores only its hash", async () => {
  let stored;
  let message;
  const repository = makeRepository({
    onReplaceChallenge(input) {
      stored = input;
    },
  });
  const send = createSendVerificationCode(repository);
  const startedAt = Date.now();

  await send(
    createDelivery({ onSend: (input) => (message = input) }),
    { id: account.id, displayName: account.displayName },
    "sample@example.com",
  );

  assert.match(message.code, /^\d{6}$/);
  assert.equal(
    stored.tokenHash,
    hashVerificationCode(account.id, message.code),
  );
  assert.equal(stored.accountId, account.id);
  assert.ok(stored.expiresAt.getTime() > startedAt + 599_000);
  // The use case starts its TTL after this test's clock; allow async setup time.
  assert.ok(stored.expiresAt.getTime() <= startedAt + 610_000);
  assert.equal(
    repository.calls.some(
      (call) => Array.isArray(call) && call[0] === "replaceChallenge",
    ),
    true,
  );
});

test("verification requests do not disclose or send codes for non-pending accounts", async () => {
  let sendCalled = false;
  const repository = makeRepository({
    resendAccount: {
      id: account.id,
      displayName: account.displayName,
      status: "active",
      verifiedAt: new Date(),
    },
  });
  const request = createRequestEmailVerification(repository, async () => {
    sendCalled = true;
  });

  assert.equal(
    await request("sample@example.com", createDelivery()),
    "not_pending",
  );
  assert.equal(sendCalled, false);
});

test("verification requests send a code only for a pending unverified account", async () => {
  let sent;
  const repository = makeRepository({
    resendAccount: {
      id: account.id,
      displayName: account.displayName,
      status: "pending_verification",
      verifiedAt: null,
    },
  });
  const request = createRequestEmailVerification(
    repository,
    async (delivery, target, email) => {
      sent = { delivery, target, email };
    },
  );
  const delivery = createDelivery();

  assert.equal(await request("sample@example.com", delivery), "sent");
  assert.deepEqual(sent, {
    delivery,
    target: { id: account.id, displayName: account.displayName },
    email: "sample@example.com",
  });
});

test("an incorrect code increments attempts and a fifth wrong code reaches the limit", async () => {
  let failedAttempt;
  const repository = makeRepository({
    challenge: {
      id: "challenge-1",
      attempts: 4,
      tokenHash: hashVerificationCode(account.id, "111111"),
    },
  });
  const tx = repository.withTransaction;
  repository.withTransaction = async (operation) =>
    tx(async (transaction) => {
      transaction.recordInvalidAttempt = async (input) => {
        failedAttempt = input;
      };
      return operation(transaction);
    });
  const confirm = createConfirmEmailVerification(repository);

  assert.deepEqual(await confirm("sample@example.com", "999999"), {
    kind: "invalid",
  });
  assert.equal(failedAttempt.attempts, 5);
  assert.equal(failedAttempt.maxAttempts, 5);
});

test("valid verification activates the account and creates device and session atomically", async () => {
  const code = "123456";
  const repository = makeRepository({
    challenge: {
      id: "challenge-valid",
      attempts: 0,
      tokenHash: hashVerificationCode(account.id, code),
    },
  });
  const confirm = createConfirmEmailVerification(repository);

  const result = await confirm("sample@example.com", code);

  assert.equal(result.kind, "authenticated");
  assert.equal(result.account.id, account.id);
  assert.equal(result.session.id, "session-1");
  assert.ok(result.deviceRawToken.length > 32);
  assert.ok(
    repository.calls.indexOf("consumeChallenge") <
      repository.calls.indexOf("verifyEmail"),
  );
  assert.ok(
    repository.calls.indexOf("verifyEmail") <
      repository.calls.indexOf("activateAccount"),
  );
  assert.ok(
    repository.calls.indexOf("activateAccount") <
      repository.calls.findIndex(
        (call) => Array.isArray(call) && call[0] === "createTrustedDevice",
      ),
  );
});

test("outdated password policy verifies and activates the account without creating a session", async () => {
  const code = "123456";
  const repository = makeRepository({
    confirmationAccount: {
      ...account,
      passwordPolicyVersion: PASSWORD_POLICY_VERSION - 1,
    },
    challenge: {
      id: "challenge-password-update",
      attempts: 0,
      tokenHash: hashVerificationCode(account.id, code),
    },
  });
  const confirm = createConfirmEmailVerification(repository);

  assert.deepEqual(await confirm("sample@example.com", code), {
    kind: "password_update_required",
  });
  assert.equal(
    repository.calls.some(
      (call) => Array.isArray(call) && call[0] === "createSession",
    ),
    false,
  );
});

test("sending fails explicitly when delivery is not configured", async () => {
  const repository = makeRepository();
  const send = createSendVerificationCode(repository);

  await assert.rejects(
    send(
      createDelivery({ isConfigured: false }),
      { id: account.id, displayName: account.displayName },
      "sample@example.com",
    ),
    VerificationDeliveryUnavailableError,
  );
  assert.equal(
    repository.calls.some(
      (call) => Array.isArray(call) && call[0] === "replaceChallenge",
    ),
    false,
  );
});
