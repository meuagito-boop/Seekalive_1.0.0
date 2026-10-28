import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { PASSWORD_POLICY_VERSION } from "@workspace/api-zod";
import {
  hashDeviceLoginCode,
  hashToken,
} from "../src/security/tokenHashing.ts";
import { createConfirmDeviceLogin } from "../src/modules/auth/application/deviceVerification/confirmDeviceLogin.ts";
import { createResendDeviceLoginCode } from "../src/modules/auth/application/deviceVerification/resendDeviceLoginCode.ts";

const applicationDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/modules/auth/application/deviceVerification",
);
const rawDeviceToken = "a".repeat(43);
const account = {
  id: "account-1",
  username: "demo",
  displayName: "Demo Account",
  accountType: "personal",
  status: "active",
  securityLockedAt: null,
  onboardingCompletedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  verifiedAt: new Date("2026-01-01T00:00:00.000Z"),
  passwordPolicyVersion: PASSWORD_POLICY_VERSION,
};

function confirmationRepository(challenge, overrides = {}) {
  return {
    async findAccountIdForChallenge() {
      return account.id;
    },
    async withTransaction(operation) {
      return operation({
        async lockConfirmationAccount() {
          return account;
        },
        async lockConfirmationChallenge() {
          return challenge;
        },
        async recordWrongCode(input) {
          overrides.recordWrongCode?.(input);
        },
        async lockAccountAndRevokeAccess(input) {
          overrides.lockAccountAndRevokeAccess?.(input);
        },
        async consumeChallenge() {
          overrides.consumeChallenge?.();
          return true;
        },
        async createTrustedDevice() {
          return "device-1";
        },
        async createSession({ material }) {
          return {
            id: "session-1",
            createdAt: material.createdAt,
            expiresAt: material.expiresAt,
          };
        },
      });
    },
    async invalidateChallenge() {},
  };
}

test("device-verification application has no direct database imports", async () => {
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

test("third incorrect device code locks the account and revokes access", async () => {
  let lockInput;
  const challenge = {
    id: "challenge-1",
    tokenHash: hashDeviceLoginCode(account.id, "challenge-1", "111111"),
    deviceTokenHash: hashToken(rawDeviceToken),
    attempts: 2,
  };
  const confirm = createConfirmDeviceLogin(
    confirmationRepository(challenge, {
      lockAccountAndRevokeAccess(input) {
        lockInput = input;
      },
    }),
  );

  const result = await confirm("challenge-1", "222222", rawDeviceToken);

  assert.deepEqual(result, { kind: "locked" });
  assert.equal(lockInput.accountId, account.id);
  assert.equal(lockInput.attempts, 3);
});

test("valid device code consumes the challenge and creates the session", async () => {
  let challengeConsumed = false;
  const challenge = {
    id: "challenge-2",
    tokenHash: hashDeviceLoginCode(account.id, "challenge-2", "123456"),
    deviceTokenHash: hashToken(rawDeviceToken),
    attempts: 0,
  };
  const confirm = createConfirmDeviceLogin(
    confirmationRepository(challenge, {
      consumeChallenge() {
        challengeConsumed = true;
      },
    }),
  );

  const result = await confirm("challenge-2", "123456", rawDeviceToken);

  assert.equal(result.kind, "authenticated");
  assert.equal(challengeConsumed, true);
  assert.equal(result.account.id, account.id);
});

test("resend respects the persisted cooldown before sending another email", async () => {
  let sentEmail = false;
  const resend = createResendDeviceLoginCode({
    async findAccountIdForChallenge() {
      return account.id;
    },
    async withTransaction(operation) {
      return operation({
        async lockResendAccount() {
          return {
            id: account.id,
            displayName: account.displayName,
            email: "demo@example.com",
            status: "active",
            verifiedAt: account.verifiedAt,
            securityLockedAt: null,
          };
        },
        async lockResendChallenge() {
          return {
            id: "challenge-3",
            tokenHash: "unused",
            deviceTokenHash: hashToken(rawDeviceToken),
            attempts: 0,
            expiresAt: new Date(Date.now() + 60_000),
            resendAvailableAt: new Date(Date.now() + 20_000),
          };
        },
      });
    },
    async invalidateChallenge() {},
  });

  const result = await resend("challenge-3", rawDeviceToken, {
    isConfigured: true,
    async sendDeviceLoginCode() {
      sentEmail = true;
    },
  });

  assert.equal(result.kind, "cooldown");
  assert.ok(result.retryAfterSeconds > 0);
  assert.equal(sentEmail, false);
});
