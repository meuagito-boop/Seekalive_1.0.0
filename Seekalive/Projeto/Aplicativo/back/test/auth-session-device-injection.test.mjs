import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { csrfHash } from "../src/security/csrf.ts";
import {
  hashDeviceLoginCode,
  hashToken,
} from "../src/security/tokenHashing.ts";
import { createResendDeviceLoginCode } from "../src/modules/auth/application/deviceVerification/resendDeviceLoginCode.ts";
import { createRotateSessionCsrfToken } from "../src/modules/auth/application/sessions/csrfSession.ts";
import { createSessionManagement } from "../src/modules/auth/application/sessions/sessionManagement.ts";
import {
  MAX_SIMULTANEOUS_SESSIONS,
  selectOldestSessionIdsToRevoke,
} from "../src/modules/auth/application/sessions/sessionPolicy.ts";
import { createTrustedDeviceManagement } from "../src/modules/auth/application/trustedDevices/deviceManagement.ts";

const authApplicationDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/modules/auth/application",
);
const accountId = "account-1";
const fixedNow = new Date("2026-01-10T12:00:00.000Z");
const rawDeviceToken = "d".repeat(43);
const verifiedAt = new Date("2026-01-01T00:00:00.000Z");

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory()
        ? sourceFiles(entryPath)
        : entry.name.endsWith(".ts")
          ? [entryPath]
          : [];
    }),
  );
  return nested.flat();
}

function resendRepository(overrides = {}) {
  return {
    async findAccountIdForChallenge() {
      return accountId;
    },
    async withTransaction(operation) {
      return operation({
        async lockResendAccount() {
          return {
            id: accountId,
            displayName: "Demo Account",
            email: "demo@example.com",
            status: "active",
            verifiedAt,
            securityLockedAt: null,
          };
        },
        async lockResendChallenge() {
          return {
            id: "challenge-1",
            tokenHash: "old-hash",
            deviceTokenHash: hashToken(rawDeviceToken),
            attempts: 0,
            expiresAt: new Date(fixedNow.getTime() + 60_000),
            resendAvailableAt: null,
          };
        },
        async updateChallengeForResend(input) {
          overrides.updateChallengeForResend?.(input);
        },
      });
    },
    async invalidateChallenge(challengeId, now) {
      overrides.invalidateChallenge?.(challengeId, now);
    },
  };
}

test("Auth application has no direct database or infrastructure imports", async () => {
  const files = await sourceFiles(authApplicationDirectory);
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /(?:from\s*|import\s*\()\s*["'](?:@workspace\/db|drizzle-orm|[^"']*\/infrastructure(?:\/[^"']*)?)["']/,
      `${path.relative(authApplicationDirectory, file)} must depend on application ports, not persistence or providers.`,
    );
  }
});

test("CSRF rotation returns the token and stores only its hash", async () => {
  let stored;
  const rotate = createRotateSessionCsrfToken({
    async updateCsrfTokenHash(sessionId, tokenHash) {
      stored = { sessionId, tokenHash };
    },
  });

  const token = await rotate("session-1");

  assert.equal(token.length, 43);
  assert.deepEqual(stored, {
    sessionId: "session-1",
    tokenHash: csrfHash(token),
  });
  assert.notEqual(stored.tokenHash, token);
});

test("session management forwards account scope, cursor and timestamp", async () => {
  const calls = [];
  const operations = createSessionManagement({
    async listActiveSessions(...args) {
      calls.push(["list", ...args]);
      return [{ id: "session-2", createdAt: fixedNow, expiresAt: fixedNow }];
    },
    async revokeOtherSessions(...args) {
      calls.push(["revokeOthers", ...args]);
      return [{ id: "session-2" }];
    },
    async revokeSession(...args) {
      calls.push(["revoke", ...args]);
      return true;
    },
    async revokeSessionByTokenHash(...args) {
      calls.push(["logout", ...args]);
    },
  });

  const listed = await operations.listActiveSessions(accountId, 20, fixedNow);
  const others = await operations.revokeOtherSessions(
    accountId,
    "session-current",
    fixedNow,
  );
  const revoked = await operations.revokeSession(
    accountId,
    "session-2",
    fixedNow,
  );
  await operations.revokeSessionByTokenHash("hashed-token", fixedNow);

  assert.equal(listed[0].id, "session-2");
  assert.deepEqual(others, [{ id: "session-2" }]);
  assert.equal(revoked, true);
  assert.deepEqual(calls, [
    ["list", accountId, 20, fixedNow],
    ["revokeOthers", accountId, "session-current", fixedNow],
    ["revoke", accountId, "session-2", fixedNow],
    ["logout", "hashed-token", fixedNow],
  ]);
});

test("trusted-device management retains account and current-device scope", async () => {
  const calls = [];
  const operations = createTrustedDeviceManagement({
    async listTrustedDevices(...args) {
      calls.push(["list", ...args]);
      return [{ id: "device-1", createdAt: fixedNow, lastSeenAt: fixedNow }];
    },
    async revokeOtherTrustedDevices(...args) {
      calls.push(["revokeOthers", ...args]);
      return ["device-2"];
    },
    async revokeTrustedDevice(...args) {
      calls.push(["revoke", ...args]);
      return { isCurrent: true };
    },
  });

  const listed = await operations.listTrustedDevices(accountId);
  const revokedOthers = await operations.revokeOtherTrustedDevices(
    accountId,
    "device-current",
    fixedNow,
  );
  const revokedCurrent = await operations.revokeTrustedDevice(
    accountId,
    "device-current",
    "device-current",
    fixedNow,
  );

  assert.equal(listed[0].id, "device-1");
  assert.deepEqual(revokedOthers, ["device-2"]);
  assert.deepEqual(revokedCurrent, { isCurrent: true });
  assert.deepEqual(calls, [
    ["list", accountId],
    ["revokeOthers", accountId, "device-current", fixedNow],
    ["revoke", accountId, "device-current", "device-current", fixedNow],
  ]);
});

test("device verification resend still sends the email code", async () => {
  let sentEmail;
  let updatedChallenge;
  const resend = createResendDeviceLoginCode(
    resendRepository({
      updateChallengeForResend(input) {
        updatedChallenge = input;
      },
    }),
  );

  const result = await resend("challenge-1", rawDeviceToken, {
    isConfigured: true,
    async sendDeviceLoginCode(message) {
      sentEmail = message;
    },
  });

  assert.equal(result.kind, "sent");
  assert.deepEqual(
    {
      email: "demo@example.com",
      displayName: "Demo Account",
      hasCode: /^\d{6}$/.test(sentEmail.code),
    },
    {
      email: "demo@example.com",
      displayName: "Demo Account",
      hasCode: true,
    },
  );
  assert.match(sentEmail.code, /^\d{6}$/);
  assert.equal(
    updatedChallenge.tokenHash,
    hashDeviceLoginCode(accountId, "challenge-1", sentEmail.code),
  );
  assert.ok(result.expiresAt instanceof Date);
  assert.ok(result.resendAvailableAt instanceof Date);
});

test("device verification resend invalidates the challenge if email is unavailable", async () => {
  let invalidated;
  let sentEmail = false;
  const resend = createResendDeviceLoginCode(
    resendRepository({
      invalidateChallenge(challengeId, now) {
        invalidated = { challengeId, now };
      },
    }),
  );

  const result = await resend("challenge-1", rawDeviceToken, {
    isConfigured: false,
    async sendDeviceLoginCode() {
      sentEmail = true;
    },
  });

  assert.deepEqual(result, { kind: "delivery_unavailable" });
  assert.equal(sentEmail, false);
  assert.equal(invalidated.challengeId, "challenge-1");
  assert.ok(invalidated.now instanceof Date);
});

test("device verification resend reports provider failure and invalidates the challenge", async () => {
  let invalidated;
  const resend = createResendDeviceLoginCode(
    resendRepository({
      invalidateChallenge(challengeId, now) {
        invalidated = { challengeId, now };
      },
    }),
  );

  const result = await resend("challenge-1", rawDeviceToken, {
    isConfigured: true,
    async sendDeviceLoginCode() {
      throw new Error("provider failed");
    },
  });

  assert.deepEqual(result, { kind: "delivery_failed" });
  assert.equal(invalidated.challengeId, "challenge-1");
  assert.ok(invalidated.now instanceof Date);
});

test("a third session revokes only the oldest active session", () => {
  assert.equal(MAX_SIMULTANEOUS_SESSIONS, 2);
  assert.deepEqual(
    selectOldestSessionIdsToRevoke([{ id: "oldest" }, { id: "newest" }]),
    ["oldest"],
  );
});

test("session creation keeps the two newest sessions when legacy excess exists", () => {
  assert.deepEqual(
    selectOldestSessionIdsToRevoke([
      { id: "oldest" },
      { id: "older" },
      { id: "newer" },
    ]),
    ["oldest", "older"],
  );
});

test("all authentication paths use the shared limited-session repository", async () => {
  const infrastructureDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../src/modules/auth/infrastructure",
  );
  const repositoryFiles = [
    "loginRepository.ts",
    "emailVerificationRepository.ts",
    "deviceVerificationRepository.ts",
  ];

  for (const fileName of repositoryFiles) {
    const source = await readFile(
      path.join(infrastructureDirectory, fileName),
      "utf8",
    );

    assert.match(source, /createSessionWithLimit\(tx, input\)/);
    assert.doesNotMatch(source, /\.insert\(sessions\)/);
  }
});
