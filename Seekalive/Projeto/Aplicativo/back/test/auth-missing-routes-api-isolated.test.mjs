import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { and, eq, isNull } from "drizzle-orm";
import { startIsolatedHttpApiHarness } from "./support/isolatedHttpApiHarness.mjs";

let harness;

async function createVerifiedAccountWithClientIp(clientIp) {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `edge-${suffix}@example.test`;
  const password = "A02_Isolated_Test_2026!";
  const preAuth = await harness.createPreAuth();
  const registration = await harness.request("/api/v1/auth/register", {
    method: "POST",
    clientIp,
    auth: preAuth,
    body: {
      accountType: "personal",
      firstName: "Conta",
      lastName: "Borda",
      username: `e_${suffix}`,
      email,
      dateOfBirth: "01/01/1990",
      password,
      passwordConfirmation: password,
      acceptedTermsVersion: "v1",
    },
  });
  assert.equal(
    registration.response.status,
    202,
    JSON.stringify(registration.body),
  );
  const message = harness.emails.verification.findLast(
    (item) => item.email === email,
  );
  assert.ok(message);
  const verification = await harness.request(
    "/api/v1/auth/verification/confirm",
    {
      method: "POST",
      clientIp,
      auth: preAuth,
      body: { email, code: message.code },
    },
  );
  assert.equal(
    verification.response.status,
    200,
    JSON.stringify(verification.body),
  );
  return {
    account: verification.body.account,
    auth: preAuth,
    email,
    password,
  };
}

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
  assert.equal(
    account.auth.cookie.includes("__Host-seekalive_session="),
    false,
  );

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
    challengesAfter.some(
      (challenge) => challenge.id !== challengesBefore[0].id,
    ),
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
  assert.equal(
    account.auth.cookie.includes("__Host-seekalive_session="),
    false,
  );
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
  const unauthenticated = await harness.request("/api/v1/auth/devices/others", {
    method: "DELETE",
    auth: unauthenticatedAuth,
  });
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

test("password reset is non-enumerating, requires pre-auth CSRF, and consumes its code once", async () => {
  const account = await createVerifiedAccountWithClientIp("198.51.100.81");
  const preAuth = await harness.createPreAuth();
  const initialEmails = harness.emails.passwordReset.length;
  const initialCredential = await harness.database.db
    .select({
      passwordHash: harness.database.passwordCredentials.passwordHash,
    })
    .from(harness.database.passwordCredentials)
    .where(
      eq(harness.database.passwordCredentials.accountId, account.account.id),
    );
  assert.equal(initialCredential.length, 1);

  const missingCsrf = await harness.request(
    "/api/v1/auth/password/reset/request",
    {
      method: "POST",
      body: { email: account.email },
      auth: { cookie: preAuth.cookie },
    },
  );
  assert.equal(missingCsrf.response.status, 403);
  assert.equal(missingCsrf.body.error.key, "CSRF_REJECTED");
  assert.equal(harness.emails.passwordReset.length, initialEmails);

  const knownAccount = await harness.request(
    "/api/v1/auth/password/reset/request",
    {
      method: "POST",
      body: { email: account.email },
      auth: preAuth,
    },
  );
  const unknownAccount = await harness.request(
    "/api/v1/auth/password/reset/request",
    {
      method: "POST",
      body: { email: `missing-${randomUUID()}@example.test` },
      auth: preAuth,
    },
  );
  assert.equal(knownAccount.response.status, 202);
  assert.equal(unknownAccount.response.status, 202);
  assert.deepEqual(unknownAccount.body, knownAccount.body);
  assert.equal(knownAccount.body.status, "reset_requested");
  const resetMessage = harness.emails.passwordReset.findLast(
    (message) => message.email === account.email,
  );
  assert.ok(resetMessage);

  const newPassword = "A03_Isolated_Reset_2026!";
  const resetBody = {
    email: account.email,
    code: resetMessage.code,
    newPassword,
    passwordConfirmation: newPassword,
  };
  const invalidCode = await harness.request(
    "/api/v1/auth/password/reset/confirm",
    {
      method: "POST",
      body: {
        ...resetBody,
        code: resetMessage.code === "000000" ? "000001" : "000000",
      },
      auth: preAuth,
    },
  );
  assert.equal(invalidCode.response.status, 400);
  assert.equal(invalidCode.body.error.key, "INVALID_PASSWORD_RESET");

  const confirmation = await harness.request(
    "/api/v1/auth/password/reset/confirm",
    { method: "POST", body: resetBody, auth: account.auth },
  );
  assert.equal(confirmation.response.status, 200);
  assert.deepEqual(confirmation.body, { status: "password_reset" });
  assert.equal(
    account.auth.cookie.includes("__Host-seekalive_session="),
    false,
  );
  assert.equal(account.auth.cookie.includes("__Host-seekalive_device="), false);

  const replay = await harness.request("/api/v1/auth/password/reset/confirm", {
    method: "POST",
    body: resetBody,
    auth: preAuth,
  });
  assert.equal(replay.response.status, 400);
  assert.equal(replay.body.error.key, "INVALID_PASSWORD_RESET");

  const [updatedCredential] = await harness.database.db
    .select({
      passwordHash: harness.database.passwordCredentials.passwordHash,
    })
    .from(harness.database.passwordCredentials)
    .where(
      eq(harness.database.passwordCredentials.accountId, account.account.id),
    );
  assert.notEqual(
    updatedCredential.passwordHash,
    initialCredential[0].passwordHash,
  );
  const activeSessions = await harness.database.db
    .select({ id: harness.database.sessions.id })
    .from(harness.database.sessions)
    .where(
      and(
        eq(harness.database.sessions.accountId, account.account.id),
        isNull(harness.database.sessions.revokedAt),
      ),
    );
  assert.deepEqual(activeSessions, []);
  const activeDevices = await harness.database.db
    .select({ id: harness.database.trustedDevices.id })
    .from(harness.database.trustedDevices)
    .where(
      and(
        eq(harness.database.trustedDevices.accountId, account.account.id),
        isNull(harness.database.trustedDevices.revokedAt),
      ),
    );
  assert.deepEqual(activeDevices, []);
});

test("session management rejects malformed cursors, self-revocation, and another account's session", async () => {
  const account = await createVerifiedAccountWithClientIp("198.51.100.82");
  const foreignAccount =
    await createVerifiedAccountWithClientIp("198.51.100.83");
  const [currentSession] = await harness.database.db
    .select({ id: harness.database.sessions.id })
    .from(harness.database.sessions)
    .where(
      and(
        eq(harness.database.sessions.accountId, account.account.id),
        isNull(harness.database.sessions.revokedAt),
      ),
    );
  const [foreignSession] = await harness.database.db
    .select({ id: harness.database.sessions.id })
    .from(harness.database.sessions)
    .where(
      and(
        eq(harness.database.sessions.accountId, foreignAccount.account.id),
        isNull(harness.database.sessions.revokedAt),
      ),
    );
  assert.ok(currentSession);
  assert.ok(foreignSession);

  const malformedCursor = await harness.request(
    "/api/v1/auth/sessions?cursor=bm90LW51bWVyaWM",
    { auth: account.auth },
  );
  assert.equal(malformedCursor.response.status, 400);
  assert.equal(malformedCursor.body.error.key, "VALIDATION_ERROR");

  const selfRevocation = await harness.request(
    `/api/v1/auth/sessions/${currentSession.id}`,
    { method: "DELETE", auth: account.auth },
  );
  assert.equal(selfRevocation.response.status, 409);
  assert.equal(selfRevocation.body.error.key, "CURRENT_SESSION_USE_LOGOUT");

  const foreignRevocation = await harness.request(
    `/api/v1/auth/sessions/${foreignSession.id}`,
    { method: "DELETE", auth: account.auth },
  );
  assert.equal(foreignRevocation.response.status, 404);
  assert.equal(foreignRevocation.body.error.key, "SESSION_NOT_FOUND");
  const [untouchedForeignSession] = await harness.database.db
    .select({ revokedAt: harness.database.sessions.revokedAt })
    .from(harness.database.sessions)
    .where(eq(harness.database.sessions.id, foreignSession.id));
  assert.equal(untouchedForeignSession.revokedAt, null);

  const invalidId = await harness.request("/api/v1/auth/sessions/not-a-uuid", {
    method: "DELETE",
    auth: account.auth,
  });
  assert.equal(invalidId.response.status, 400);
  assert.equal(invalidId.body.error.key, "VALIDATION_ERROR");
});

test("device-login confirmation without its installation token cannot consume a valid challenge", async () => {
  const account = await createVerifiedAccountWithClientIp("198.51.100.84");
  const preAuth = await harness.createPreAuth();
  const cookieWithoutInstallation = preAuth.cookie;
  const csrfToken = preAuth.csrfToken;
  const login = await harness.request("/api/v1/auth/login", {
    method: "POST",
    auth: preAuth,
    clientIp: "198.51.100.85",
    body: {
      identifier: account.email,
      password: account.password,
    },
  });
  assert.equal(login.response.status, 202, JSON.stringify(login.body));
  assert.equal(login.body.status, "device_verification_required");
  const message = harness.emails.deviceLogin.findLast(
    (item) => item.email === account.email,
  );
  assert.ok(message, "A valid device challenge must have a delivered code.");

  const confirmation = await harness.request(
    "/api/v1/auth/device-verification/confirm",
    {
      method: "POST",
      body: { challengeId: login.body.challengeId, code: message.code },
      auth: { cookie: cookieWithoutInstallation, csrfToken },
      clientIp: "198.51.100.85",
    },
  );
  assert.equal(confirmation.response.status, 400);
  assert.equal(confirmation.body.error.key, "DEVICE_VERIFICATION_EXPIRED");
  assert.equal(confirmation.body.error.message.includes(message.code), false);
});

test("device-login code enforces progressive resend cooldowns and locks after three wrong attempts", async () => {
  const account = await createVerifiedAccountWithClientIp("198.51.100.86");
  const preAuth = await harness.createPreAuth();
  const loginIp = "198.51.100.87";
  const login = await harness.request("/api/v1/auth/login", {
    method: "POST",
    auth: preAuth,
    clientIp: loginIp,
    body: {
      identifier: account.email,
      password: account.password,
    },
  });
  assert.equal(login.response.status, 202, JSON.stringify(login.body));
  assert.equal(login.body.status, "device_verification_required");
  const message = harness.emails.deviceLogin.findLast(
    (item) => item.email === account.email,
  );
  assert.ok(message);
  const wrongCode = message.code === "000000" ? "000001" : "000000";
  const confirmationPath = "/api/v1/auth/device-verification/confirm";
  const resendPath = "/api/v1/auth/device-verification/resend";
  const confirmationBody = {
    challengeId: login.body.challengeId,
    code: wrongCode,
  };

  const firstWrongCode = await harness.request(confirmationPath, {
    method: "POST",
    auth: preAuth,
    clientIp: loginIp,
    body: confirmationBody,
  });
  assert.equal(firstWrongCode.response.status, 400);
  assert.equal(firstWrongCode.body.error.key, "INVALID_DEVICE_CODE");
  assert.equal(firstWrongCode.body.error.attemptsRemaining, 2);
  assert.ok(
    Date.parse(firstWrongCode.body.error.resendAvailableAt) > Date.now(),
  );

  const firstCooldown = await harness.request(resendPath, {
    method: "POST",
    auth: preAuth,
    clientIp: loginIp,
    body: { challengeId: login.body.challengeId },
  });
  assert.equal(firstCooldown.response.status, 429);
  assert.equal(firstCooldown.body.error.key, "CODE_RESEND_COOLDOWN");
  assert.ok(
    firstCooldown.body.error.retryAfterSeconds > 0 &&
      firstCooldown.body.error.retryAfterSeconds <= 30,
  );

  const secondWrongCode = await harness.request(confirmationPath, {
    method: "POST",
    auth: preAuth,
    clientIp: loginIp,
    body: confirmationBody,
  });
  assert.equal(secondWrongCode.response.status, 400);
  assert.equal(secondWrongCode.body.error.key, "INVALID_DEVICE_CODE");
  assert.equal(secondWrongCode.body.error.attemptsRemaining, 1);

  const secondCooldown = await harness.request(resendPath, {
    method: "POST",
    auth: preAuth,
    clientIp: loginIp,
    body: { challengeId: login.body.challengeId },
  });
  assert.equal(secondCooldown.response.status, 429);
  assert.equal(secondCooldown.body.error.key, "CODE_RESEND_COOLDOWN");
  assert.ok(
    secondCooldown.body.error.retryAfterSeconds > 0 &&
      secondCooldown.body.error.retryAfterSeconds <= 90,
  );

  const thirdWrongCode = await harness.request(confirmationPath, {
    method: "POST",
    auth: preAuth,
    clientIp: loginIp,
    body: confirmationBody,
  });
  assert.equal(thirdWrongCode.response.status, 423);
  assert.equal(thirdWrongCode.body.error.key, "SECURITY_LOCKED");
  assert.equal(
    thirdWrongCode.body.error.supportEmail,
    "admseekalive@gmail.com",
  );

  const [lockedAccount] = await harness.database.db
    .select({ securityLockedAt: harness.database.accounts.securityLockedAt })
    .from(harness.database.accounts)
    .where(eq(harness.database.accounts.id, account.account.id));
  assert.ok(lockedAccount.securityLockedAt instanceof Date);
});

test("login route returns 429 after the configured per-IP attempt limit", async () => {
  const preAuth = await harness.createPreAuth();
  const clientIp = "198.51.100.121";

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const result = await harness.request("/api/v1/auth/login", {
      method: "POST",
      auth: preAuth,
      clientIp,
      body: {
        identifier: `nonexistent-${attempt}@example.test`,
        password: "Wrong_Password_2026!",
      },
    });
    assert.equal(result.response.status, 401, JSON.stringify(result.body));
    assert.equal(result.body.error.key, "INVALID_CREDENTIALS");
  }

  const rateLimited = await harness.request("/api/v1/auth/login", {
    method: "POST",
    auth: preAuth,
    clientIp,
    body: {
      identifier: "another-nonexistent@example.test",
      password: "Wrong_Password_2026!",
    },
  });
  assert.equal(rateLimited.response.status, 429);
  assert.equal(rateLimited.body.error.key, "RATE_LIMITED");
  assert.ok(Number(rateLimited.response.headers.get("retry-after")) > 0);
});
