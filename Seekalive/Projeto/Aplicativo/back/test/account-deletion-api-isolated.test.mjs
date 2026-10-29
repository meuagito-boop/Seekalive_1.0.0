import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, isNull } from "drizzle-orm";
import {
  configureIsolatedDatabaseEnvironment,
  createIsolatedSchemaName,
  setupIsolatedDatabaseFixture,
} from "./support/isolatedDatabaseFixture.mjs";

const schemaName = createIsolatedSchemaName();
const projectRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const expectedDatabase = process.env.SEEKALIVE_EXPECTED_DATABASE?.trim();
const sessionSecret = "seekalive-account-deletion-api-isolated-secret";

configureIsolatedDatabaseEnvironment({ schemaName, sessionSecret });

const { accounts, db, pool, sessions } = await import("@workspace/db");
const { PRE_AUTH_COOKIE, SESSION_COOKIE } =
  await import("../src/security/sessionConfig.ts");
let server;
let baseUrl;
let isolatedDatabaseFixture;
const verificationMessages = [];
const deletionMessages = [];

before(async () => {
  isolatedDatabaseFixture = await setupIsolatedDatabaseFixture({
    schemaName,
    expectedDatabase,
    projectRoot,
    pool,
  });

  const { setAuthEmailDeliveryForTests } =
    await import("../src/modules/auth/infrastructure/emailDelivery.ts");
  setAuthEmailDeliveryForTests({
    isConfigured: true,
    async sendVerificationCode(message) {
      verificationMessages.push(message);
    },
    async sendPasswordResetCode() {},
    async sendDeviceLoginCode() {},
    async sendPasswordUpdateCode() {},
    async sendAccountPasswordChangeCode() {},
    async sendAccountEmailChangeCurrentCode() {},
    async sendAccountEmailChangeNewCode() {},
    async sendAccountEmailChangeSecurityNotice() {},
    async sendAccountDeletionCode(message) {
      deletionMessages.push(message);
    },
  });

  const { default: app } = await import("../src/app.ts");
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server?.listening) {
    const stopped = new Promise((resolveStop, rejectStop) => {
      server.close((error) => (error ? rejectStop(error) : resolveStop()));
      server.closeAllConnections();
    });
    await stopped;
  }

  if (isolatedDatabaseFixture) {
    const cleanup = await isolatedDatabaseFixture.cleanup();
    assert.equal(cleanup.schemaRemoved, true);
    assert.equal(cleanup.publicSchemaUnchanged, true);
  } else {
    await pool.end();
  }
});

function responseCookies(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  return [response.headers.get("set-cookie") ?? ""];
}

function cookieValue(response, name) {
  const cookie = responseCookies(response)
    .map((value) => value.split(";")[0])
    .findLast((value) => value.startsWith(`${name}=`));
  assert.ok(cookie, `Expected ${name} cookie.`);
  return cookie;
}

function mergeResponseCookies(auth, response) {
  if (!auth) return;

  const values = new Map(
    (auth.cookie ?? "")
      .split(";")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => {
        const separator = value.indexOf("=");
        return [value.slice(0, separator), value.slice(separator + 1)];
      }),
  );

  for (const cookie of responseCookies(response)) {
    const [pair, ...attributes] = cookie.split(";");
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    const isCleared = attributes.some(
      (attribute) => attribute.trim().toLowerCase() === "max-age=0",
    );
    if (isCleared || value === "") values.delete(name);
    else values.set(name, value);
  }

  auth.cookie = [...values]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function request(path, { method = "GET", body, auth } = {}) {
  const headers = new Headers({
    "x-seekalive-client-ip": "203.0.113.42",
  });
  if (body !== undefined) headers.set("content-type", "application/json");
  if (auth?.cookie) headers.set("cookie", auth.cookie);
  if (auth?.csrfToken) headers.set("x-csrf-token", auth.csrfToken);

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  const parsedBody = text ? JSON.parse(text) : null;
  mergeResponseCookies(auth, response);
  if (auth && parsedBody?.csrfToken) auth.csrfToken = parsedBody.csrfToken;
  return { response, body: parsedBody };
}

async function createPreAuth() {
  const { response, body } = await request("/api/v1/auth/csrf");
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(typeof body.csrfToken, "string");
  return {
    cookie: cookieValue(response, PRE_AUTH_COOKIE),
    csrfToken: body.csrfToken,
  };
}

test("real API schedules and restores deletion with an authenticated session and isolated persistence", async () => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `deletion-${suffix}@example.test`;
  const password = "A02_Isolated_Test_2026!";
  const preAuth = await createPreAuth();

  const registration = await request("/api/v1/auth/register", {
    method: "POST",
    auth: preAuth,
    body: {
      accountType: "personal",
      firstName: "Conta",
      lastName: "Isolada",
      username: `d_${suffix}`,
      email,
      age: 18,
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

  const verificationMessage = verificationMessages.findLast(
    (message) => message.email === email && message.code,
  );
  assert.ok(
    verificationMessage,
    "The in-memory mail sink must capture verification.",
  );
  const verification = await request("/api/v1/auth/verification/confirm", {
    method: "POST",
    auth: preAuth,
    body: { email, code: verificationMessage.code },
  });
  assert.equal(
    verification.response.status,
    200,
    JSON.stringify(verification.body),
  );
  const accountId = verification.body.account.id;
  assert.ok(preAuth.cookie.includes(`${SESSION_COOKIE}=`));
  assert.equal(typeof preAuth.csrfToken, "string");
  const publicProfileBeforeDeletion = await request(
    `/api/v1/profiles/d_${suffix}`,
  );
  assert.equal(publicProfileBeforeDeletion.response.status, 200);
  assert.equal(
    publicProfileBeforeDeletion.body.account.username,
    `d_${suffix}`,
  );

  const unauthenticated = await createPreAuth();
  const messagesBeforeUnauthorizedRequest = deletionMessages.length;
  const unauthorized = await request("/api/v1/auth/account/deletion/code", {
    method: "POST",
    auth: unauthenticated,
    body: {},
  });
  assert.equal(unauthorized.response.status, 401);
  assert.equal(unauthorized.body.error.key, "UNAUTHENTICATED");
  assert.equal(deletionMessages.length, messagesBeforeUnauthorizedRequest);

  const codeRequest = await request("/api/v1/auth/account/deletion/code", {
    method: "POST",
    auth: preAuth,
    body: {},
  });
  assert.equal(
    codeRequest.response.status,
    202,
    JSON.stringify(codeRequest.body),
  );
  assert.equal(codeRequest.body.status, "verification_code_sent");
  assert.notEqual(codeRequest.body.emailMasked, email);
  const deletionCode = deletionMessages.findLast(
    (message) => message.purpose === "request_deletion" && message.code,
  );
  assert.ok(
    deletionCode,
    "The deletion code must be delivered only to the in-memory sink.",
  );
  assert.equal(deletionCode.email, email);

  const confirmation = await request("/api/v1/auth/account/deletion/confirm", {
    method: "POST",
    auth: preAuth,
    body: {
      challengeId: codeRequest.body.challengeId,
      code: deletionCode.code,
    },
  });
  assert.equal(
    confirmation.response.status,
    200,
    JSON.stringify(confirmation.body),
  );
  assert.equal(confirmation.body.status, "deletion_scheduled");
  assert.equal(preAuth.cookie.includes(`${SESSION_COOKIE}=`), false);

  const [pendingAccount] = await db
    .select({
      status: accounts.status,
      deletionRequestedAt: accounts.deletionRequestedAt,
      deletionScheduledFor: accounts.deletionScheduledFor,
    })
    .from(accounts)
    .where(eq(accounts.id, accountId));
  assert.equal(pendingAccount.status, "deletion_pending");
  assert.ok(pendingAccount.deletionRequestedAt);
  assert.equal(
    pendingAccount.deletionScheduledFor.getTime() -
      pendingAccount.deletionRequestedAt.getTime(),
    7 * 24 * 60 * 60 * 1000,
  );
  const hiddenPublicProfile = await request(`/api/v1/profiles/d_${suffix}`);
  assert.equal(hiddenPublicProfile.response.status, 404);
  assert.equal(hiddenPublicProfile.body.error.key, "ACCOUNT_NOT_FOUND");

  const restorationAuth = await createPreAuth();
  const pendingLogin = await request("/api/v1/auth/login", {
    method: "POST",
    auth: restorationAuth,
    body: { identifier: email, password },
  });
  assert.equal(pendingLogin.response.status, 202);
  assert.equal(pendingLogin.body.status, "account_deletion_pending");
  assert.equal(typeof pendingLogin.body.deletionScheduledFor, "string");
  assert.equal(restorationAuth.cookie.includes(`${SESSION_COOKIE}=`), false);

  const restorationCodeRequest = await request(
    "/api/v1/auth/account/deletion/restore/code",
    {
      method: "POST",
      auth: restorationAuth,
      body: { identifier: email, password },
    },
  );
  assert.equal(restorationCodeRequest.response.status, 202);
  const restorationCode = deletionMessages.findLast(
    (message) => message.purpose === "restore_account" && message.code,
  );
  assert.ok(
    restorationCode,
    "The restoration code must reach the in-memory sink.",
  );

  const restorationBody = {
    challengeId: restorationCodeRequest.body.challengeId,
    identifier: email,
    password,
  };
  const incorrectCode = restorationCode.code === "000000" ? "000001" : "000000";
  const rejectedRestoration = await request(
    "/api/v1/auth/account/deletion/restore/confirm",
    {
      method: "POST",
      auth: restorationAuth,
      body: { ...restorationBody, code: incorrectCode },
    },
  );
  assert.equal(rejectedRestoration.response.status, 400);
  assert.equal(rejectedRestoration.body.error.key, "INVALID_VERIFICATION_CODE");

  const successfulRestoration = await request(
    "/api/v1/auth/account/deletion/restore/confirm",
    {
      method: "POST",
      auth: restorationAuth,
      body: { ...restorationBody, code: restorationCode.code },
    },
  );
  assert.equal(successfulRestoration.response.status, 200);
  assert.deepEqual(successfulRestoration.body, { status: "account_restored" });
  assert.equal(
    responseCookies(successfulRestoration.response).some((cookie) =>
      cookie.startsWith(`${SESSION_COOKIE}=`),
    ),
    false,
    "Restoration must not issue a session.",
  );

  const [restoredAccount] = await db
    .select({
      status: accounts.status,
      deletionRequestedAt: accounts.deletionRequestedAt,
      deletionScheduledFor: accounts.deletionScheduledFor,
    })
    .from(accounts)
    .where(eq(accounts.id, accountId));
  assert.deepEqual(restoredAccount, {
    status: "active",
    deletionRequestedAt: null,
    deletionScheduledFor: null,
  });
  const publicProfileAfterRestoration = await request(
    `/api/v1/profiles/d_${suffix}`,
  );
  assert.equal(publicProfileAfterRestoration.response.status, 200);
  assert.equal(
    publicProfileAfterRestoration.body.account.username,
    `d_${suffix}`,
  );

  const activeSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.accountId, accountId), isNull(sessions.revokedAt)));
  assert.deepEqual(activeSessions, []);
});
