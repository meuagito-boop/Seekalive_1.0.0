import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { and, eq, isNull } from "drizzle-orm";
import { startIsolatedHttpApiHarness } from "./support/isolatedHttpApiHarness.mjs";

let harness;

before(async () => {
  harness = await startIsolatedHttpApiHarness({
    sessionSecret: "seekalive-auth-missing-routes-isolated-secret",
    requiredTables: [
      "accountEmails",
      "accounts",
      "authChallenges",
      "passwordCredentials",
      "sessions",
      "trustedDevices",
    ],
  });
});

after(async () => {
  if (harness) await harness.close();
});

test("POST /api/v1/auth/logout revokes the persisted session and clears its cookies", async () => {
  const account = await harness.createVerifiedAccount("personal");
  const sessionBefore = await harness.database.db
    .select({
      id: harness.database.sessions.id,
      revokedAt: harness.database.sessions.revokedAt,
    })
    .from(harness.database.sessions)
    .where(
      and(
        eq(harness.database.sessions.accountId, account.account.id),
        isNull(harness.database.sessions.revokedAt),
      ),
    );
  assert.equal(sessionBefore.length, 1);

  const withoutCsrf = await harness.request("/api/v1/auth/logout", {
    method: "POST",
    auth: { cookie: account.auth.cookie },
  });
  assert.equal(withoutCsrf.response.status, 403);
  assert.equal(withoutCsrf.body.error.key, "CSRF_REJECTED");
  const stillActive = await harness.database.db
    .select({ id: harness.database.sessions.id })
    .from(harness.database.sessions)
    .where(
      and(
        eq(harness.database.sessions.id, sessionBefore[0].id),
        isNull(harness.database.sessions.revokedAt),
      ),
    );
  assert.equal(stillActive.length, 1);

  const logout = await harness.request("/api/v1/auth/logout", {
    method: "POST",
    auth: account.auth,
  });
  assert.equal(logout.response.status, 204);
  assert.equal(logout.body, null);
  assert.equal(account.auth.cookie.includes("__Host-seekalive_session="), false);

  const [revokedSession] = await harness.database.db
    .select({ revokedAt: harness.database.sessions.revokedAt })
    .from(harness.database.sessions)
    .where(eq(harness.database.sessions.id, sessionBefore[0].id));
  assert.ok(revokedSession.revokedAt instanceof Date);

  const sessionState = await harness.request("/api/v1/auth/session", {
    auth: account.auth,
  });
  assert.equal(sessionState.response.status, 200);
  assert.equal(sessionState.body.authenticated, false);
});

test("POST /api/v1/auth/verification resends for a pending account with pre-auth CSRF", async () => {
  const preAuth = await harness.createPreAuth();
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `resend-${suffix}@example.test`;
  const password = "A02_Isolated_Test_2026!";
  const pending = await harness.registerAccount(
    {
      accountType: "personal",
      firstName: "Conta",
      lastName: "Pendente",
      username: `r_${suffix}`.slice(0, 20),
      email,
      dateOfBirth: "01/01/1990",
      password,
      passwordConfirmation: password,
      acceptedTermsVersion: "v1",
    },
    preAuth,
  );
  const initialMessages = harness.emails.verification.filter(
    (message) => message.email === email,
  );
  assert.equal(initialMessages.length, 1);

  const missingCsrf = await harness.request("/api/v1/auth/verification", {
    method: "POST",
    body: { email },
    auth: { cookie: preAuth.cookie },
  });
  assert.equal(missingCsrf.response.status, 403);
  assert.equal(missingCsrf.body.error.key, "CSRF_REJECTED");

  const [pendingAccount] = await harness.database.db
    .select({ id: harness.database.accountEmails.accountId })
    .from(harness.database.accountEmails)
    .where(eq(harness.database.accountEmails.emailNormalized, email));
  assert.ok(pendingAccount);
  const challengesBefore = await harness.database.db
    .select({
      id: harness.database.authChallenges.id,
      consumedAt: harness.database.authChallenges.consumedAt,
      createdAt: harness.database.authChallenges.createdAt,
    })
    .from(harness.database.authChallenges)
    .where(
      and(
        eq(harness.database.authChallenges.accountId, pendingAccount.id),
        eq(harness.database.authChallenges.purpose, "verify_email"),
      ),
    );
  const resend = await harness.request("/api/v1/auth/verification", {
    method: "POST",
    body: { email },
    auth: preAuth,
  });
  assert.equal(resend.response.status, 202);
  assert.equal(resend.body.status, "verification_required");
  const messagesAfter = harness.emails.verification.filter(
    (message) => message.email === email,
  );
  assert.equal(messagesAfter.length, 2);

  const challengesAfter = await harness.database.db
    .select({
      id: harness.database.authChallenges.id,
      consumedAt: harness.database.authChallenges.consumedAt,
      createdAt: harness.database.authChallenges.createdAt,
    })
    .from(harness.database.authChallenges)
    .where(
      and(
        eq(harness.database.authChallenges.accountId, pendingAccount.id),
        eq(harness.database.authChallenges.purpose, "verify_email"),
      ),
    );
  assert.equal(challengesAfter.length, challengesBefore.length + 1);
  const replacedChallenge = challengesAfter.find(
    (challenge) => challenge.id === challengesBefore[0].id,
  );
  assert.ok(replacedChallenge?.consumedAt instanceof Date);
  assert.equal(
    challengesAfter.filter((challenge) => challenge.consumedAt === null).length,
    1,
  );
  assert.ok(
    challengesAfter.some((challenge) => challenge.id !== challengesBefore[0].id),
  );
});

test("DELETE /api/v1/auth/devices/:deviceId enforces CSRF, ownership, and revokes its device session", async () => {
  const account = await harness.createVerifiedAccount("personal");
  const foreignAccount = await harness.createVerifiedAccount("personal");
  const [currentDevice] = await harness.database.db
    .select({ id: harness.database.trustedDevices.id })
    .from(harness.database.trustedDevices)
    .where(
      and(
        eq(harness.database.trustedDevices.accountId, account.account.id),
        isNull(harness.database.trustedDevices.revokedAt),
      ),
    );
  const [foreignDevice] = await harness.database.db
    .select({ id: harness.database.trustedDevices.id })
    .from(harness.database.trustedDevices)
    .where(
      and(
        eq(
          harness.database.trustedDevices.accountId,
          foreignAccount.account.id,
        ),
        isNull(harness.database.trustedDevices.revokedAt),
      ),
    );
  assert.ok(currentDevice);
  assert.ok(foreignDevice);

  const unauthenticatedAuth = await harness.createPreAuth();
  const unauthenticated = await harness.request(
    `/api/v1/auth/devices/${currentDevice.id}`,
    { method: "DELETE", auth: unauthenticatedAuth },
  );
  assert.equal(unauthenticated.response.status, 401);
  assert.equal(unauthenticated.body.error.key, "AUTH_REQUIRED");

  const withoutCsrf = await harness.request(
    `/api/v1/auth/devices/${currentDevice.id}`,
    {
      method: "DELETE",
      auth: { cookie: account.auth.cookie },
    },
  );
  assert.equal(withoutCsrf.response.status, 403);
  assert.equal(withoutCsrf.body.error.key, "CSRF_REJECTED");

  const forbidden = await harness.request(
    `/api/v1/auth/devices/${foreignDevice.id}`,
    { method: "DELETE", auth: account.auth },
  );
  assert.equal(forbidden.response.status, 404);
  assert.equal(forbidden.body.error.key, "DEVICE_NOT_FOUND");
  const [untouchedForeignDevice] = await harness.database.db
    .select({ revokedAt: harness.database.trustedDevices.revokedAt })
    .from(harness.database.trustedDevices)
    .where(eq(harness.database.trustedDevices.id, foreignDevice.id));
  assert.equal(untouchedForeignDevice.revokedAt, null);

  const deletion = await harness.request(
    `/api/v1/auth/devices/${currentDevice.id}`,
    { method: "DELETE", auth: account.auth },
  );
  assert.equal(deletion.response.status, 204);
  assert.equal(account.auth.cookie.includes("__Host-seekalive_session="), false);
  assert.equal(account.auth.cookie.includes("__Host-seekalive_device="), false);

  const [revokedDevice] = await harness.database.db
    .select({ revokedAt: harness.database.trustedDevices.revokedAt })
    .from(harness.database.trustedDevices)
    .where(eq(harness.database.trustedDevices.id, currentDevice.id));
  assert.ok(revokedDevice.revokedAt instanceof Date);
  const revokedSessions = await harness.database.db
    .select({
      id: harness.database.sessions.id,
      revokedAt: harness.database.sessions.revokedAt,
    })
    .from(harness.database.sessions)
    .where(
      and(
        eq(harness.database.sessions.accountId, account.account.id),
        eq(harness.database.sessions.deviceId, currentDevice.id),
      ),
    );
  assert.equal(revokedSessions.length, 1);
  assert.ok(revokedSessions[0].revokedAt instanceof Date);
  const sessionState = await harness.request("/api/v1/auth/session", {
    auth: account.auth,
  });
  assert.equal(sessionState.body.authenticated, false);
});

test("DELETE /api/v1/auth/devices/others revokes other device sessions but preserves the current session", async () => {
  const account = await harness.createVerifiedAccount("personal");
  const secondDeviceAuth = await harness.createPreAuth();
  const login = await harness.request("/api/v1/auth/login", {
    method: "POST",
    body: {
      identifier: account.email,
      password: account.password,
    },
    auth: secondDeviceAuth,
    clientIp: "203.0.113.43",
  });
  assert.equal(login.response.status, 202);
  assert.equal(login.body.status, "device_verification_required");
  const deviceLoginMessage = harness.emails.deviceLogin.findLast(
    (message) => message.email === account.email,
  );
  assert.ok(deviceLoginMessage);
  const deviceConfirmation = await harness.request(
    "/api/v1/auth/device-verification/confirm",
    {
      method: "POST",
      body: {
        challengeId: login.body.challengeId,
        code: deviceLoginMessage.code,
      },
      auth: secondDeviceAuth,
      clientIp: "203.0.113.43",
    },
  );
  assert.equal(deviceConfirmation.response.status, 200);

  const devices = await harness.database.db
    .select({
      id: harness.database.trustedDevices.id,
      revokedAt: harness.database.trustedDevices.revokedAt,
    })
    .from(harness.database.trustedDevices)
    .where(eq(harness.database.trustedDevices.accountId, account.account.id));
  assert.equal(devices.length, 2);
  const sessionsBefore = await harness.database.db
    .select({
      id: harness.database.sessions.id,
      deviceId: harness.database.sessions.deviceId,
      revokedAt: harness.database.sessions.revokedAt,
    })
    .from(harness.database.sessions)
    .where(eq(harness.database.sessions.accountId, account.account.id));
  assert.equal(sessionsBefore.length, 2);
  const currentDeviceList = await harness.request("/api/v1/auth/devices", {
    auth: account.auth,
  });
  assert.equal(currentDeviceList.response.status, 200);
  const currentDevice = currentDeviceList.body.items.find(
    (device) => device.isCurrent,
  );
  assert.ok(currentDevice);
  const currentSession = sessionsBefore.find(
    (session) => session.deviceId === currentDevice.id,
  );
  assert.ok(currentSession);

  const unauthenticatedAuth = await harness.createPreAuth();
  const unauthenticated = await harness.request(
    "/api/v1/auth/devices/others",
    { method: "DELETE", auth: unauthenticatedAuth },
  );
  assert.equal(unauthenticated.response.status, 401);
  assert.equal(unauthenticated.body.error.key, "AUTH_REQUIRED");

  const withoutCsrf = await harness.request("/api/v1/auth/devices/others", {
    method: "DELETE",
    auth: { cookie: account.auth.cookie },
  });
  assert.equal(withoutCsrf.response.status, 403);
  assert.equal(withoutCsrf.body.error.key, "CSRF_REJECTED");

  const revokeOthers = await harness.request("/api/v1/auth/devices/others", {
    method: "DELETE",
    auth: account.auth,
  });
  assert.equal(revokeOthers.response.status, 200);
  assert.equal(revokeOthers.body.status, "other_devices_revoked");
  assert.equal(revokeOthers.body.revokedCount, 1);

  const devicesAfter = await harness.database.db
    .select({
      id: harness.database.trustedDevices.id,
      revokedAt: harness.database.trustedDevices.revokedAt,
    })
    .from(harness.database.trustedDevices)
    .where(eq(harness.database.trustedDevices.accountId, account.account.id));
  const revokedDevice = devicesAfter.find(
    (device) => device.id !== currentSession.deviceId,
  );
  assert.ok(revokedDevice?.revokedAt instanceof Date);
  const sessionsAfter = await harness.database.db
    .select({
      id: harness.database.sessions.id,
      revokedAt: harness.database.sessions.revokedAt,
    })
    .from(harness.database.sessions)
    .where(eq(harness.database.sessions.accountId, account.account.id));
  assert.ok(
    sessionsAfter.find((session) => session.id === currentSession.id)
      ?.revokedAt === null,
  );
  const otherSession = sessionsAfter.find(
    (session) => session.id !== currentSession.id,
  );
  assert.ok(otherSession?.revokedAt instanceof Date);

  const sessionState = await harness.request("/api/v1/auth/session", {
    auth: account.auth,
  });
  assert.equal(sessionState.body.authenticated, true);
});
