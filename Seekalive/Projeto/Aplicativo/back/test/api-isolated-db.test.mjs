import assert from "node:assert/strict";
import { once } from "node:events";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { after, before, test } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, inArray, isNull } from "drizzle-orm";

const schemaName = `seekalive_test_${randomUUID().replaceAll("-", "")}`;
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const expectedDatabase = process.env.SEEKALIVE_EXPECTED_DATABASE?.trim();
const isProductionRuntime =
  process.env.NODE_ENV?.trim().toLowerCase() === "production" ||
  Boolean(process.env.REPLIT_DEPLOYMENT?.trim());

if (process.env.SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS !== "1") {
  throw new Error("Set SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS=1 to authorize this isolated write test.");
}
if (isProductionRuntime) {
  throw new Error("Isolated database tests are not allowed in a production runtime.");
}
if (!process.env.DATABASE_URL || !expectedDatabase) {
  throw new Error("DATABASE_URL and SEEKALIVE_EXPECTED_DATABASE are required.");
}

process.env.NODE_ENV = "test";
process.env.SEEKALIVE_DB_SCHEMA = schemaName;
process.env.SESSION_SECRET = "seekalive-isolated-test-session-secret-2026";
process.env.RESEND_ENABLED = "false";
delete process.env.RESEND_API_KEY;
delete process.env.RESEND_FROM_EMAIL;

const database = await import("@workspace/db");
const {
  accountBlocks,
  accountEmails,
  accountFollows,
  accountFollowRequests,
  accountInterests,
  accountUsernameReservations,
  accounts,
  authChallenges,
  commercialProfiles,
  db,
  feedPosts,
  passwordCredentials,
  pool,
  sessions,
  trustedDevices,
} = database;
const { getTableConfig } = await import("drizzle-orm/pg-core");
const { passwordPolicySchema } = await import("@workspace/api-zod");
const require = createRequire(import.meta.url);
const argon2 = require("argon2");

const modelTables = [
  accounts,
  accountEmails,
  passwordCredentials,
  commercialProfiles,
  authChallenges,
  sessions,
  trustedDevices,
  accountInterests,
  accountFollows,
  accountFollowRequests,
  accountBlocks,
  accountUsernameReservations,
  feedPosts,
];
const expectedTables = [
  "account_blocks",
  "account_emails",
  "account_follow_requests",
  "account_follows",
  "account_interests",
  "account_username_reservations",
  "accounts",
  "auth_challenges",
  "business_profiles",
  "feed_posts",
  "password_credentials",
  "sessions",
  "trusted_devices",
];

for (const table of modelTables) {
  assert.equal(
    getTableConfig(table).schema,
    schemaName,
    "Every application table must target the temporary schema before any write test runs.",
  );
}

function quoteGeneratedSchema(name) {
  assert.match(name, /^seekalive_test_[0-9a-f]{32}$/i);
  return `"${name}"`;
}

async function publicSchemaFingerprint() {
  const [columns, constraints, indexes, views] = await Promise.all([
    pool.query(`
      SELECT table_name, column_name, ordinal_position, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `),
    pool.query(`
      SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS definition
      FROM pg_catalog.pg_constraint
      WHERE connamespace = 'public'::regnamespace
      ORDER BY conrelid::regclass::text, conname
    `),
    pool.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_catalog.pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `),
    pool.query(`
      SELECT table_name, view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
      ORDER BY table_name
    `),
  ]);
  return createHash("sha256")
    .update(JSON.stringify({
      columns: columns.rows,
      constraints: constraints.rows,
      indexes: indexes.rows,
      views: views.rows,
    }))
    .digest("hex");
}

let schemaCreated = false;
let server;
let baseUrl;
let publicSchemaBefore;
const emailMessages = [];
const passwordResetMessages = [];
const deviceLoginMessages = [];
const passwordUpdateMessages = [];
const accountPasswordChangeMessages = [];
const accountEmailChangeCurrentMessages = [];
const accountEmailChangeNewMessages = [];
const accountEmailChangeSecurityNotices = [];

before(async () => {
  const { rows } = await pool.query("SELECT current_database() AS database_name");
  assert.equal(
    rows[0]?.database_name,
    expectedDatabase,
    "DATABASE_URL must point to the Replit development database identified by the read-only check.",
  );
  publicSchemaBefore = await publicSchemaFingerprint();

  await pool.query(`CREATE SCHEMA ${quoteGeneratedSchema(schemaName)}`);
  schemaCreated = true;

  const push = spawnSync("pnpm", ["--filter", "@workspace/db", "run", "push"], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
    env: {
      ...process.env,
      NODE_ENV: "test",
      SEEKALIVE_DB_SCHEMA: schemaName,
      SEEKALIVE_DB_MIGRATION_TARGET: "replit",
    },
  });
  const pushOutput = `${push.stdout ?? ""}\n${push.stderr ?? ""}`.replaceAll(
    process.env.DATABASE_URL,
    "[DATABASE_URL REDACTED]",
  );
  if (push.error || push.status !== 0) {
    throw new Error(`Drizzle could not create the isolated schema (exit ${push.status ?? "unknown"}):\n${pushOutput}`);
  }

  const createdTables = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' ORDER BY table_name`,
    [schemaName],
  );
  assert.deepEqual(createdTables.rows.map((row) => row.table_name), expectedTables);
  assert.equal(await publicSchemaFingerprint(), publicSchemaBefore, "Schema push changed the public schema.");

  const { setAuthEmailDeliveryForTests } = await import("../src/modules/auth/presentation/routes.ts");
  setAuthEmailDeliveryForTests({
    isConfigured: true,
    async sendVerificationCode(message) {
      emailMessages.push(message);
    },
    async sendPasswordResetCode(message) {
      passwordResetMessages.push(message);
    },
    async sendDeviceLoginCode(message) {
      deviceLoginMessages.push(message);
    },
    async sendPasswordUpdateCode(message) {
      passwordUpdateMessages.push(message);
    },
    async sendAccountPasswordChangeCode(message) {
      accountPasswordChangeMessages.push(message);
    },
    async sendAccountEmailChangeCurrentCode(message) {
      accountEmailChangeCurrentMessages.push(message);
    },
    async sendAccountEmailChangeNewCode(message) {
      accountEmailChangeNewMessages.push(message);
    },
    async sendAccountEmailChangeSecurityNotice(message) {
      accountEmailChangeSecurityNotices.push(message);
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
  try {
    if (schemaCreated) {
      await pool.query(`DROP SCHEMA ${quoteGeneratedSchema(schemaName)} CASCADE`);
      schemaCreated = false;
      console.log("Isolated test schema dropped.");
    }
  } finally {
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
    const isCleared = attributes.some((attribute) => attribute.trim().toLowerCase() === "max-age=0");
    if (isCleared || value === "") values.delete(name);
    else values.set(name, value);
  }
  auth.cookie = [...values].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function request(
  path,
  {
    method = "GET",
    body,
    auth,
    clientIp = "203.0.113.42",
    autoDeviceVerification = true,
    autoCompletePasswordUpdate = true,
  } = {},
) {
  const deviceMessageCount = deviceLoginMessages.length;
  const passwordUpdateMessageCount = passwordUpdateMessages.length;
  const headers = new Headers();
  if (clientIp !== null) headers.set("x-seekalive-client-ip", clientIp);
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

  if (
    autoDeviceVerification
    && path === "/api/v1/auth/login"
    && response.status === 202
    && parsedBody?.status === "device_verification_required"
  ) {
    const message = deviceLoginMessages.slice(deviceMessageCount).findLast((item) => item.code);
    assert.ok(message, "A device login challenge must send a code to the test email sink.");
    return request("/api/v1/auth/device-verification/confirm", {
      method: "POST",
      body: { challengeId: parsedBody.challengeId, code: message.code },
      auth,
      clientIp,
      autoDeviceVerification: false,
      autoCompletePasswordUpdate: false,
    });
  }

  if (
    autoCompletePasswordUpdate
    && path === "/api/v1/auth/password/update"
    && response.status === 202
    && parsedBody?.status === "password_update_verification_required"
  ) {
    const message = passwordUpdateMessages.slice(passwordUpdateMessageCount).findLast((item) => item.code);
    assert.ok(message, "A password update challenge must send a code to the test email sink.");
    return request("/api/v1/auth/password/update/confirm", {
      method: "POST",
      body: { challengeId: parsedBody.challengeId, code: message.code },
      auth,
      clientIp,
      autoDeviceVerification: false,
      autoCompletePasswordUpdate: false,
    });
  }

  return { response, body: parsedBody };
}

test("login and email verification do not require an IP to recognize the device", async () => {
  const preAuth = await createPreAuth();
  const login = await request("/api/v1/auth/login", {
    method: "POST",
    body: { identifier: "not-a-real-account", password: "invalid-password" },
    auth: preAuth,
    clientIp: null,
  });
  assert.equal(login.response.status, 401);
  assert.equal(login.body.error.key, "INVALID_CREDENTIALS");
  assert.equal(login.body.error.code, 1104);

  const verification = await request("/api/v1/auth/verification/confirm", {
    method: "POST",
    body: { email: "not-a-real-account@example.com", code: "000000" },
    auth: preAuth,
    clientIp: null,
  });
  assert.equal(verification.response.status, 400);
  assert.equal(verification.body.error.key, "INVALID_VERIFICATION_CODE");
});

async function createPreAuth() {
  const { response, body } = await request("/api/v1/auth/csrf");
  assert.equal(response.status, 200);
  assert.equal(typeof body.csrfToken, "string");
  return {
    cookie: cookieValue(response, "__Host-seekalive_pre_auth"),
    csrfToken: body.csrfToken,
  };
}

async function registerAccount(registration, preAuth, clientIp) {
  const { response, body } = await request("/api/v1/auth/register", {
    method: "POST",
    body: registration,
    auth: preAuth,
    clientIp,
  });
  assert.equal(response.status, 202, JSON.stringify(body));
  assert.equal(body.status, "verification_required");
  const email = registration.email.toLowerCase();
  const message = emailMessages.findLast((item) => item.email === email);
  assert.ok(message, "The test email sink should capture the verification message.");
  return { email, password: registration.password, message };
}

async function confirmAccount(pending, preAuth, clientIp) {
  const { response, body } = await request("/api/v1/auth/verification/confirm", {
    method: "POST",
    body: { email: pending.email, code: pending.message.code },
    auth: preAuth,
    clientIp,
  });
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.emailVerified, true);
  return {
    account: body.account,
    cookie: preAuth.cookie,
    csrfToken: body.csrfToken,
  };
}

test("registration, verification, onboarding, privacy, mutual circle and block rules persist in an isolated schema", async () => {
  const suffix = randomUUID().slice(0, 8);
  const password = "A02_Isolated_Test_2026!";
  const preAuth = await createPreAuth();
  const underageAccount = await request("/api/v1/auth/register", {
    method: "POST",
    body: {
      accountType: "personal",
      firstName: "Pessoa",
      lastName: "Menor",
      username: `u_${suffix}`,
      email: `underage-${suffix}@example.com`,
      age: 17,
      password,
      passwordConfirmation: password,
      acceptedTermsVersion: "v1",
    },
    auth: preAuth,
  });
  assert.equal(underageAccount.response.status, 400);

  const underageBusiness = await request("/api/v1/auth/register", {
    method: "POST",
    body: {
      accountType: "commercial",
      businessName: "Empresa Menor",
      categoryKey: "cafes",
      discoveryKind: "place",
      address: "Rua de Teste, 100",
      postalCode: "01001000",
      city: "São Paulo",
      state: "SP",
      country: "Brasil",
      username: `b_${suffix}`,
      email: `underage-business-${suffix}@example.com`,
      age: 17,
      password,
      passwordConfirmation: password,
      acceptedTermsVersion: "v1",
    },
    auth: preAuth,
  });
  assert.equal(underageBusiness.response.status, 400);

  const invalidPasswordPolicyCases = [
    "a02_test_2026!", // no uppercase
    "A02_TEST_2026!", // no lowercase
    "Aa_Test!", // no number
    "AaTest2026", // no special character
    "A1!bc", // too short
  ];
  for (const candidate of invalidPasswordPolicyCases) {
    assert.equal(passwordPolicySchema.safeParse(candidate).success, false, `Expected policy rejection for ${candidate}`);
  }
  assert.equal(passwordPolicySchema.safeParse(password).success, true);
  const weakPasswordRegistration = await request("/api/v1/auth/register", {
    method: "POST",
    body: {
      accountType: "personal",
      firstName: "Pessoa",
      lastName: "Senha",
      username: `weak_${suffix}`,
      email: `weak-password-${suffix}@example.com`,
      age: 18,
      password: "a02_test_2026!",
      passwordConfirmation: "a02_test_2026!",
      acceptedTermsVersion: "v1",
    },
    auth: preAuth,
  });
  assert.equal(weakPasswordRegistration.response.status, 400);

  const rejectedDatabaseInsert = await pool.query(
    `INSERT INTO ${quoteGeneratedSchema(schemaName)}.accounts
      (username, age, accepted_terms_version, display_name, account_type)
     VALUES ($1, 17, 'v1', 'Menor de idade', 'personal')`,
    [`db_${suffix}`],
  ).then(
    () => null,
    (error) => error,
  );
  assert.equal(rejectedDatabaseInsert?.code, "23514");
  assert.equal(rejectedDatabaseInsert?.constraint, "accounts_age_adult_range");

  const personalRegistration = {
    accountType: "personal",
    firstName: "Conta",
    lastName: "Isolada",
    username: `p_${suffix}`,
    email: `personal-${suffix}@example.com`,
    age: 18,
    password,
    passwordConfirmation: password,
    acceptedTermsVersion: "v1",
  };
  const pendingPersonal = await registerAccount(personalRegistration, preAuth);

  const loginBeforeVerification = await request("/api/v1/auth/login", {
    method: "POST",
    body: { identifier: pendingPersonal.email, password },
    auth: preAuth,
  });
  assert.equal(loginBeforeVerification.response.status, 403);
  assert.equal(loginBeforeVerification.body.error.key, "EMAIL_NOT_VERIFIED");

  const personal = await confirmAccount(pendingPersonal, preAuth);
  assert.equal(personal.account.accountType, "personal");
  const [newPersonalCredential] = await db
    .select({ passwordPolicyVersion: passwordCredentials.passwordPolicyVersion })
    .from(passwordCredentials)
    .where(eq(passwordCredentials.accountId, personal.account.id));
  assert.equal(newPersonalCredential.passwordPolicyVersion, 1);
  const oldPersonalSession = { ...personal };
  const legacyPassword = "Oldpassword123";
  const legacyPasswordHash = await argon2.hash(legacyPassword, {
    type: argon2.argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
  });
  await db
    .update(passwordCredentials)
    .set({ passwordHash: legacyPasswordHash, passwordPolicyVersion: 0 })
    .where(eq(passwordCredentials.accountId, personal.account.id));
  await db
    .update(sessions)
    .set({ passwordPolicyVersion: 0 })
    .where(eq(sessions.accountId, personal.account.id));
  const legacySessionRejected = await request("/api/v1/auth/session", { auth: oldPersonalSession });
  assert.equal(legacySessionRejected.body.authenticated, false);

  const legacyLoginPreAuth = await createPreAuth();
  const legacyLogin = await request("/api/v1/auth/login", {
    method: "POST",
    body: { identifier: pendingPersonal.email, password: legacyPassword },
    auth: legacyLoginPreAuth,
  });
  assert.equal(legacyLogin.response.status, 403);
  assert.equal(legacyLogin.body.error.key, "PASSWORD_UPDATE_REQUIRED");
  assert.equal(
    responseCookies(legacyLogin.response).some((cookie) => cookie.startsWith("__Host-seekalive_session=")),
    false,
    "A legacy password outside policy must not receive a session.",
  );

  const failedPasswordUpdate = await request("/api/v1/auth/password/update", {
    method: "POST",
    body: {
      identifier: pendingPersonal.email,
      currentPassword: "IncorrectOldPassword1!",
      newPassword: "B03_Updated_Test_2026!",
      passwordConfirmation: "B03_Updated_Test_2026!",
    },
    auth: await createPreAuth(),
  });
  assert.equal(failedPasswordUpdate.response.status, 401);

  const passwordUpdate = await request("/api/v1/auth/password/update", {
    method: "POST",
    body: {
      identifier: pendingPersonal.email,
      currentPassword: legacyPassword,
      newPassword: "B03_Updated_Test_2026!",
      passwordConfirmation: "B03_Updated_Test_2026!",
    },
    auth: await createPreAuth(),
  });
  assert.equal(passwordUpdate.response.status, 200, JSON.stringify(passwordUpdate.body));
  const revokedLegacySession = await request("/api/v1/auth/session", { auth: oldPersonalSession });
  assert.equal(revokedLegacySession.body.authenticated, false);

  const oldPasswordLogin = await request("/api/v1/auth/login", {
    method: "POST",
    body: { identifier: pendingPersonal.email, password: legacyPassword },
    auth: await createPreAuth(),
  });
  assert.equal(oldPasswordLogin.response.status, 401);
  const upgradedLogin = await request("/api/v1/auth/login", {
    method: "POST",
    body: { identifier: pendingPersonal.email, password: "B03_Updated_Test_2026!" },
    auth: await createPreAuth(),
  });
  assert.equal(upgradedLogin.response.status, 200, JSON.stringify(upgradedLogin.body));
  personal.cookie = cookieValue(upgradedLogin.response, "__Host-seekalive_session");
  personal.csrfToken = upgradedLogin.body.csrfToken;

  const unknownResetRequest = await request("/api/v1/auth/password/reset/request", {
    method: "POST",
    body: { email: `unknown-${suffix}@example.com` },
    auth: await createPreAuth(),
  });
  assert.equal(unknownResetRequest.response.status, 202);
  assert.equal(unknownResetRequest.body.status, "reset_requested");
  assert.equal(passwordResetMessages.length, 0);

  const validResetRequest = await request("/api/v1/auth/password/reset/request", {
    method: "POST",
    body: { email: pendingPersonal.email },
    auth: await createPreAuth(),
  });
  assert.equal(validResetRequest.response.status, 202);
  assert.deepEqual(validResetRequest.body, unknownResetRequest.body, "Reset request must not reveal whether the address exists.");
  assert.equal(passwordResetMessages.length, 1);
  const resetCode = passwordResetMessages.at(-1).code;
  const [storedResetChallenge] = await db
    .select({ tokenHash: authChallenges.tokenHash, purpose: authChallenges.purpose })
    .from(authChallenges)
    .where(and(
      eq(authChallenges.accountId, personal.account.id),
      eq(authChallenges.purpose, "reset_password"),
    ));
  assert.equal(storedResetChallenge.purpose, "reset_password");
  assert.notEqual(storedResetChallenge.tokenHash, resetCode);
  assert.equal(storedResetChallenge.tokenHash.length, 64);

  const cooledDownResetRequest = await request("/api/v1/auth/password/reset/request", {
    method: "POST",
    body: { email: pendingPersonal.email },
    auth: await createPreAuth(),
  });
  assert.deepEqual(cooledDownResetRequest.body, unknownResetRequest.body);
  assert.equal(passwordResetMessages.length, 1, "Account cooldown must suppress repeated reset emails.");

  const wrongResetCode = await request("/api/v1/auth/password/reset/confirm", {
    method: "POST",
    body: {
      email: pendingPersonal.email,
      code: resetCode === "000000" ? "000001" : "000000",
      newPassword: "C04_Recovered_Test_2026!",
      passwordConfirmation: "C04_Recovered_Test_2026!",
    },
    auth: await createPreAuth(),
  });
  assert.equal(wrongResetCode.response.status, 400);
  assert.equal(wrongResetCode.body.error.key, "INVALID_PASSWORD_RESET");

  const resetPassword = await request("/api/v1/auth/password/reset/confirm", {
    method: "POST",
    body: {
      email: pendingPersonal.email,
      code: resetCode,
      newPassword: "C04_Recovered_Test_2026!",
      passwordConfirmation: "C04_Recovered_Test_2026!",
    },
    auth: await createPreAuth(),
  });
  assert.equal(resetPassword.response.status, 200, JSON.stringify(resetPassword.body));
  assert.equal(resetPassword.body.status, "password_reset");
  assert.equal(
    responseCookies(resetPassword.response).some((cookie) =>
      cookie.startsWith("__Host-seekalive_session=") && /Expires=Thu, 01 Jan 1970/i.test(cookie)),
    true,
  );
  assert.equal(
    responseCookies(resetPassword.response).some((cookie) =>
      cookie.startsWith("__Host-seekalive_device=") && /Expires=Thu, 01 Jan 1970/i.test(cookie)),
    true,
  );
  const sessionRevokedByReset = await request("/api/v1/auth/session", { auth: personal });
  assert.equal(sessionRevokedByReset.body.authenticated, false);

  const replayedResetCode = await request("/api/v1/auth/password/reset/confirm", {
    method: "POST",
    body: {
      email: pendingPersonal.email,
      code: resetCode,
      newPassword: "D05_Replay_Test_2026!",
      passwordConfirmation: "D05_Replay_Test_2026!",
    },
    auth: await createPreAuth(),
  });
  assert.equal(replayedResetCode.response.status, 400);
  assert.equal(replayedResetCode.body.error.key, "INVALID_PASSWORD_RESET");

  const resetPasswordLogin = await request("/api/v1/auth/login", {
    method: "POST",
    body: { identifier: pendingPersonal.email, password: "C04_Recovered_Test_2026!" },
    auth: await createPreAuth(),
  });
  assert.equal(resetPasswordLogin.response.status, 200, JSON.stringify(resetPasswordLogin.body));
  personal.cookie = cookieValue(resetPasswordLogin.response, "__Host-seekalive_session");
  personal.csrfToken = resetPasswordLogin.body.csrfToken;

  await db
    .update(authChallenges)
    .set({ createdAt: new Date(Date.now() - 61_000) })
    .where(and(
      eq(authChallenges.accountId, personal.account.id),
      eq(authChallenges.purpose, "reset_password"),
    ));
  const expiredCodeRequest = await request("/api/v1/auth/password/reset/request", {
    method: "POST",
    body: { email: pendingPersonal.email },
    auth: await createPreAuth(),
  });
  assert.equal(expiredCodeRequest.response.status, 202);
  const expiredCode = passwordResetMessages.at(-1).code;
  await db
    .update(authChallenges)
    .set({ expiresAt: new Date(Date.now() - 1) })
    .where(and(
      eq(authChallenges.accountId, personal.account.id),
      eq(authChallenges.purpose, "reset_password"),
      isNull(authChallenges.consumedAt),
    ));
  const expiredResetConfirmation = await request("/api/v1/auth/password/reset/confirm", {
    method: "POST",
    body: {
      email: pendingPersonal.email,
      code: expiredCode,
      newPassword: "E06_Expired_Test_2026!",
      passwordConfirmation: "E06_Expired_Test_2026!",
    },
    auth: await createPreAuth(),
  });
  assert.equal(expiredResetConfirmation.response.status, 400);
  assert.equal(expiredResetConfirmation.body.error.key, "INVALID_PASSWORD_RESET");

  const currentSession = await request("/api/v1/auth/session", { auth: personal });
  assert.equal(currentSession.response.status, 200);
  assert.equal(currentSession.body.authenticated, true);
  const personalOwnerProfile = await request("/api/v1/accounts/me", { auth: personal });
  assert.equal(personalOwnerProfile.response.status, 200, JSON.stringify(personalOwnerProfile.body));
  assert.equal(personalOwnerProfile.body.email, personalRegistration.email.toLowerCase());
  assert.equal("age" in personalOwnerProfile.body, false);
  assert.equal(personalOwnerProfile.body.firstName, "Conta");
  assert.equal(personalOwnerProfile.body.lastName, "Isolada");
  assert.equal(personalOwnerProfile.body.commercialProfile, null);
  assert.ok(Date.parse(personalOwnerProfile.body.publicNameChangeAvailableAt) > Date.now());
  assert.ok(Date.parse(personalOwnerProfile.body.usernameChangeAvailableAt) > Date.now());
  assert.equal("email" in personalOwnerProfile.body.account, false);
  assert.equal("age" in personalOwnerProfile.body.account, false);

  const earlyPersonalNameChange = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: personal,
    body: {
      firstName: "Nome Novo",
      lastName: "Sobrenome Novo",
      version: personalOwnerProfile.body.account.version,
    },
  });
  assert.equal(earlyPersonalNameChange.response.status, 409);
  assert.equal(earlyPersonalNameChange.body.error.key, "NAME_CHANGE_COOLDOWN");

  const earlyPersonalUsernameChange = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: personal,
    body: {
      username: `pnew_${suffix}`,
      version: personalOwnerProfile.body.account.version,
    },
  });
  assert.equal(earlyPersonalUsernameChange.response.status, 409);
  assert.equal(earlyPersonalUsernameChange.body.error.key, "USERNAME_CHANGE_COOLDOWN");

  await pool.query(
    `UPDATE ${quoteGeneratedSchema(schemaName)}.accounts
     SET created_at = now() - interval '31 days' WHERE id = $1`,
    [personal.account.id],
  );
  const eligiblePersonalProfile = await request("/api/v1/accounts/me", { auth: personal });
  assert.equal(eligiblePersonalProfile.response.status, 200);
  assert.ok(Date.parse(eligiblePersonalProfile.body.publicNameChangeAvailableAt) < Date.now());
  assert.ok(Date.parse(eligiblePersonalProfile.body.usernameChangeAvailableAt) < Date.now());

  const updatedPersonalProfile = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: personal,
    body: {
      firstName: "Conta Revisada",
      lastName: "Isolada",
      username: `pnew_${suffix}`,
      version: eligiblePersonalProfile.body.account.version,
    },
  });
  assert.equal(updatedPersonalProfile.response.status, 200, JSON.stringify(updatedPersonalProfile.body));
  assert.equal(updatedPersonalProfile.body.account.displayName, "Conta Revisada Isolada");
  assert.equal(updatedPersonalProfile.body.account.username, `pnew_${suffix}`);
  assert.equal(updatedPersonalProfile.body.firstName, "Conta Revisada");
  assert.equal("age" in updatedPersonalProfile.body, false);
  assert.equal(updatedPersonalProfile.body.email, personalRegistration.email.toLowerCase());
  assert.ok(Date.parse(updatedPersonalProfile.body.publicNameChangeAvailableAt) > Date.now());
  assert.ok(Date.parse(updatedPersonalProfile.body.usernameChangeAvailableAt) > Date.now());

  const immediateSecondNameChange = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: personal,
    body: {
      firstName: "Outro Nome",
      lastName: "Outro Sobrenome",
      version: updatedPersonalProfile.body.account.version,
    },
  });
  assert.equal(immediateSecondNameChange.response.status, 409);
  assert.equal(immediateSecondNameChange.body.error.key, "NAME_CHANGE_COOLDOWN");

  const immediateSecondUsernameChange = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: personal,
    body: {
      username: `psecond_${suffix}`,
      version: updatedPersonalProfile.body.account.version,
    },
  });
  assert.equal(immediateSecondUsernameChange.response.status, 409);
  assert.equal(immediateSecondUsernameChange.body.error.key, "USERNAME_CHANGE_COOLDOWN");

  const oldUsernameAvailability = await request(
    `/api/v1/accounts/availability?username=${encodeURIComponent(personalRegistration.username)}`,
    { auth: personal },
  );
  assert.equal(oldUsernameAvailability.response.status, 200);
  assert.equal(oldUsernameAvailability.body.available, false);

  const oldUsernameRegistration = await request("/api/v1/auth/register", {
    method: "POST",
    auth: await createPreAuth(),
    clientIp: "203.0.113.50",
    body: {
      ...personalRegistration,
      email: `reserved-${suffix}@example.com`,
    },
  });
  assert.equal(oldUsernameRegistration.response.status, 409);
  assert.equal(oldUsernameRegistration.body.error.key, "USERNAME_UNAVAILABLE");

  await pool.query(
    `UPDATE ${quoteGeneratedSchema(schemaName)}.account_username_reservations
     SET reserved_until = now() - interval '1 second' WHERE username = $1`,
    [personalRegistration.username],
  );
  const expiredUsernameAvailability = await request(
    `/api/v1/accounts/availability?username=${encodeURIComponent(personalRegistration.username)}`,
    { auth: personal },
  );
  assert.equal(expiredUsernameAvailability.body.available, true);

  const reclaimedUsernameRegistration = await request("/api/v1/auth/register", {
    method: "POST",
    auth: await createPreAuth(),
    clientIp: "203.0.113.51",
    body: {
      ...personalRegistration,
      email: `reclaimed-${suffix}@example.com`,
    },
  });
  assert.equal(reclaimedUsernameRegistration.response.status, 202, JSON.stringify(reclaimedUsernameRegistration.body));

  const personalCommercialFieldAttempt = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: personal,
    body: {
      commercialProfile: {
        address: "Rua de Teste, 200",
        postalCode: "01001000",
        cityName: "São Paulo",
        stateName: "SP",
        countryName: "Brasil",
      },
      version: updatedPersonalProfile.body.account.version,
    },
  });
  assert.equal(personalCommercialFieldAttempt.response.status, 400);
  assert.equal(personalCommercialFieldAttempt.body.error.key, "ACCOUNT_FIELD_NOT_ALLOWED");

  const personalAgeEditAttempt = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: personal,
    body: { age: 19, version: updatedPersonalProfile.body.account.version },
  });
  assert.equal(personalAgeEditAttempt.response.status, 400);

  const personalStaleVersionAttempt = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: personal,
    body: { bio: "Atualização antiga", version: personalOwnerProfile.body.account.version },
  });
  assert.equal(personalStaleVersionAttempt.response.status, 409);
  assert.equal(personalStaleVersionAttempt.body.error.key, "VERSION_CONFLICT");
  const storedPersonalAge = await pool.query(
    `SELECT age FROM ${quoteGeneratedSchema(schemaName)}.accounts WHERE id = $1`,
    [personal.account.id],
  );
  assert.equal(Number(storedPersonalAge.rows[0]?.age), 18);

  const onboarding = await request("/api/v1/onboarding/interests", {
    method: "POST",
    auth: personal,
    body: { interests: ["cafes", "gastronomia"], skipped: false },
  });
  assert.equal(onboarding.response.status, 200, JSON.stringify(onboarding.body));
  assert.equal(onboarding.body.interestCount, 2);
  const savedInterests = await db
    .select({ interestKey: accountInterests.interestKey })
    .from(accountInterests)
    .where(eq(accountInterests.accountId, personal.account.id));
  assert.deepEqual(savedInterests.map((row) => row.interestKey).sort(), ["cafes", "gastronomia"]);

  const suffixCommercial = `${suffix}c`;
  const commercialPreAuth = await createPreAuth();
  const commercialRegistration = {
    accountType: "commercial",
    businessName: "Comércio Isolado A02",
    categoryKey: "cafes",
    discoveryKind: "place",
    address: "Rua de Teste, 100",
    postalCode: "01001000",
    city: "São Paulo",
    state: "SP",
    country: "Brasil",
    username: `c_${suffixCommercial}`,
    email: `commercial-${suffix}@example.com`,
    age: 35,
    password,
    passwordConfirmation: password,
    acceptedTermsVersion: "v1",
  };
  const pendingCommercial = await registerAccount(commercialRegistration, commercialPreAuth);
  const resetMessagesBeforeUnverifiedAccount = passwordResetMessages.length;
  const pendingAccountResetRequest = await request("/api/v1/auth/password/reset/request", {
    method: "POST",
    body: { email: pendingCommercial.email },
    auth: await createPreAuth(),
  });
  assert.deepEqual(pendingAccountResetRequest.body, unknownResetRequest.body);
  assert.equal(passwordResetMessages.length, resetMessagesBeforeUnverifiedAccount, "Unverified accounts must not receive password-reset messages.");
  const [pendingCommercialAccount] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.username, commercialRegistration.username))
    .limit(1);
  assert.ok(pendingCommercialAccount);
  await db
    .update(passwordCredentials)
    .set({ passwordPolicyVersion: 0 })
    .where(eq(passwordCredentials.accountId, pendingCommercialAccount.id));
  const legacyCommercialConfirmation = await request("/api/v1/auth/verification/confirm", {
    method: "POST",
    body: { email: pendingCommercial.email, code: pendingCommercial.message.code },
    auth: commercialPreAuth,
  });
  assert.equal(legacyCommercialConfirmation.response.status, 200, JSON.stringify(legacyCommercialConfirmation.body));
  assert.equal(legacyCommercialConfirmation.body.passwordUpdateRequired, true);
  const commercialLogin = await request("/api/v1/auth/login", {
    method: "POST",
    body: { identifier: pendingCommercial.email, password },
    auth: await createPreAuth(),
  });
  assert.equal(commercialLogin.response.status, 200, JSON.stringify(commercialLogin.body));
  const commercial = {
    account: commercialLogin.body.account,
    cookie: cookieValue(commercialLogin.response, "__Host-seekalive_session"),
    csrfToken: commercialLogin.body.csrfToken,
  };
  assert.equal(commercial.account.accountType, "commercial");

  const initialSessionPage = await request("/api/v1/auth/sessions", { auth: personal });
  assert.equal(initialSessionPage.response.status, 200, JSON.stringify(initialSessionPage.body));
  assert.ok(initialSessionPage.body.items.some((session) => session.isCurrent));
  assert.equal(initialSessionPage.body.items.some((session) => session.id === commercialLogin.body.session.id), false);

  const anonymousSessionList = await request("/api/v1/auth/sessions", { auth: await createPreAuth() });
  assert.equal(anonymousSessionList.response.status, 401);
  const invalidSessionCursor = await request("/api/v1/auth/sessions?cursor=not-valid!", { auth: personal });
  assert.equal(invalidSessionCursor.response.status, 400);
  const invalidSessionId = await request("/api/v1/auth/sessions/not-a-uuid", {
    method: "DELETE",
    auth: personal,
  });
  assert.equal(invalidSessionId.response.status, 400);
  const revokeCurrentSession = await request(`/api/v1/auth/sessions/${resetPasswordLogin.body.session.id}`, {
    method: "DELETE",
    auth: personal,
  });
  assert.equal(revokeCurrentSession.response.status, 409);
  const revokeWithoutCsrf = await request("/api/v1/auth/sessions/others", {
    method: "DELETE",
    auth: { cookie: personal.cookie },
  });
  assert.equal(revokeWithoutCsrf.response.status, 403);

  const crossAccountSessionRevoke = await request(
    `/api/v1/auth/sessions/${commercialLogin.body.session.id}`,
    { method: "DELETE", auth: personal },
  );
  assert.equal(crossAccountSessionRevoke.response.status, 404, "A session ID from another account must not be accessible.");

  const secondPersonalLogin = await request("/api/v1/auth/login", {
    method: "POST",
    body: { identifier: pendingPersonal.email, password: "C04_Recovered_Test_2026!" },
    auth: await createPreAuth(),
  });
  assert.equal(secondPersonalLogin.response.status, 200, JSON.stringify(secondPersonalLogin.body));
  const secondPersonalSession = {
    cookie: cookieValue(secondPersonalLogin.response, "__Host-seekalive_session"),
    csrfToken: secondPersonalLogin.body.csrfToken,
  };
  const sessionsWithTwoLogins = await request("/api/v1/auth/sessions", { auth: personal });
  assert.equal(sessionsWithTwoLogins.response.status, 200);
  assert.equal(sessionsWithTwoLogins.body.items.length, 2);
  assert.equal(sessionsWithTwoLogins.body.items.filter((session) => session.isCurrent).length, 1);

  const revokeOneSession = await request(`/api/v1/auth/sessions/${secondPersonalLogin.body.session.id}`, {
    method: "DELETE",
    auth: personal,
  });
  assert.equal(revokeOneSession.response.status, 204);
  const revokedIndividualSession = await request("/api/v1/auth/session", { auth: secondPersonalSession });
  assert.equal(revokedIndividualSession.body.authenticated, false);

  const thirdPersonalLogin = await request("/api/v1/auth/login", {
    method: "POST",
    body: { identifier: pendingPersonal.email, password: "C04_Recovered_Test_2026!" },
    auth: await createPreAuth(),
  });
  assert.equal(thirdPersonalLogin.response.status, 200, JSON.stringify(thirdPersonalLogin.body));
  const thirdPersonalSession = {
    cookie: cookieValue(thirdPersonalLogin.response, "__Host-seekalive_session"),
    csrfToken: thirdPersonalLogin.body.csrfToken,
  };
  const revokeOtherSessions = await request("/api/v1/auth/sessions/others", {
    method: "DELETE",
    auth: personal,
  });
  assert.equal(revokeOtherSessions.response.status, 200, JSON.stringify(revokeOtherSessions.body));
  assert.equal(revokeOtherSessions.body.revokedCount, 1);
  assert.equal((await request("/api/v1/auth/session", { auth: personal })).body.authenticated, true);
  assert.equal((await request("/api/v1/auth/session", { auth: thirdPersonalSession })).body.authenticated, false);
  const repeatedRevokeOtherSessions = await request("/api/v1/auth/sessions/others", {
    method: "DELETE",
    auth: personal,
  });
  assert.equal(repeatedRevokeOtherSessions.response.status, 200);
  assert.equal(repeatedRevokeOtherSessions.body.revokedCount, 0);

  const [upgradedCommercialCredential] = await db
    .select({ passwordPolicyVersion: passwordCredentials.passwordPolicyVersion })
    .from(passwordCredentials)
    .where(eq(passwordCredentials.accountId, commercial.account.id));
  assert.equal(upgradedCommercialCredential.passwordPolicyVersion, 1);
  const publicProfile = await request(`/api/v1/profiles/${commercial.account.username}`, { auth: personal });
  assert.equal(publicProfile.response.status, 200, JSON.stringify(publicProfile.body));
  assert.equal(publicProfile.body.account.id, commercial.account.id);
  assert.equal(publicProfile.body.visibility.canViewPublicContent, true);
  assert.deepEqual(publicProfile.body.posts, { items: [], nextCursor: null });
  assert.equal("isVerified" in publicProfile.body.account, false);
  assert.equal("commercialProfile" in publicProfile.body.account, false);
  assert.equal("address" in publicProfile.body.account, false);
  assert.equal("email" in publicProfile.body.account, false);
  assert.equal("age" in publicProfile.body.account, false);
  const commercialOwnerProfile = await request("/api/v1/accounts/me", { auth: commercial });
  assert.equal(commercialOwnerProfile.response.status, 200, JSON.stringify(commercialOwnerProfile.body));
  assert.equal(commercialOwnerProfile.body.account.id, commercial.account.id);
  assert.equal(commercialOwnerProfile.body.email, commercialRegistration.email.toLowerCase());
  assert.equal("age" in commercialOwnerProfile.body, false);
  assert.deepEqual(commercialOwnerProfile.body.commercialProfile, {
    categoryKey: "cafes",
    discoveryKind: "place",
    address: "Rua de Teste, 100",
    postalCode: "01001000",
    cityName: "São Paulo",
    stateName: "SP",
    countryName: "Brasil",
  });

  const earlyCommercialNameChange = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: commercial,
    body: {
      displayName: "Nome Comercial Novo",
      version: commercialOwnerProfile.body.account.version,
    },
  });
  assert.equal(earlyCommercialNameChange.response.status, 409);
  assert.equal(earlyCommercialNameChange.body.error.key, "NAME_CHANGE_COOLDOWN");

  await pool.query(
    `UPDATE ${quoteGeneratedSchema(schemaName)}.accounts
     SET created_at = now() - interval '31 days' WHERE id = $1`,
    [commercial.account.id],
  );
  const eligibleCommercialProfile = await request("/api/v1/accounts/me", { auth: commercial });
  assert.ok(Date.parse(eligibleCommercialProfile.body.publicNameChangeAvailableAt) < Date.now());

  const usernameAlreadyTaken = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: commercial,
    body: {
      username: updatedPersonalProfile.body.account.username,
      version: eligibleCommercialProfile.body.account.version,
    },
  });
  assert.equal(usernameAlreadyTaken.response.status, 409);
  assert.equal(usernameAlreadyTaken.body.error.key, "USERNAME_UNAVAILABLE");

  const updatedCommercialProfile = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: commercial,
    body: {
      displayName: "Comércio Revisado A02",
      commercialProfile: {
        address: "Avenida de Teste, 200",
        postalCode: "04567000",
        cityName: "Campinas",
        stateName: "Rio de Janeiro",
        countryName: "Brasil",
      },
      version: eligibleCommercialProfile.body.account.version,
    },
  });
  assert.equal(updatedCommercialProfile.response.status, 200, JSON.stringify(updatedCommercialProfile.body));
  assert.equal(updatedCommercialProfile.body.account.displayName, "Comércio Revisado A02");
  assert.ok(Date.parse(updatedCommercialProfile.body.publicNameChangeAvailableAt) > Date.now());
  assert.equal("age" in updatedCommercialProfile.body, false);
  assert.deepEqual(updatedCommercialProfile.body.commercialProfile, {
    categoryKey: "cafes",
    discoveryKind: "place",
    address: "Avenida de Teste, 200",
    postalCode: "04567000",
    cityName: "Campinas",
    stateName: "Rio de Janeiro",
    countryName: "Brasil",
  });
  const storedCommercialAge = await pool.query(
    `SELECT age FROM ${quoteGeneratedSchema(schemaName)}.accounts WHERE id = $1`,
    [commercial.account.id],
  );
  assert.equal(Number(storedCommercialAge.rows[0]?.age), 35);

  const commercialPersonalFieldAttempt = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: commercial,
    body: {
      firstName: "Nome",
      lastName: "Inválido",
      version: updatedCommercialProfile.body.account.version,
    },
  });
  assert.equal(commercialPersonalFieldAttempt.response.status, 400);
  assert.equal(commercialPersonalFieldAttempt.body.error.key, "ACCOUNT_FIELD_NOT_ALLOWED");

  const publicProfileAfterCommercialEdit = await request(
    `/api/v1/profiles/${commercial.account.username}`,
    { auth: personal },
  );
  assert.equal(publicProfileAfterCommercialEdit.response.status, 200);
  assert.equal(publicProfileAfterCommercialEdit.body.account.displayName, "Comércio Revisado A02");
  assert.equal("email" in publicProfileAfterCommercialEdit.body.account, false);
  assert.equal("age" in publicProfileAfterCommercialEdit.body.account, false);

  const immediateSecondCommercialNameChange = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: commercial,
    body: {
      displayName: "Outra Empresa",
      version: updatedCommercialProfile.body.account.version,
    },
  });
  assert.equal(immediateSecondCommercialNameChange.response.status, 409);
  assert.equal(immediateSecondCommercialNameChange.body.error.key, "NAME_CHANGE_COOLDOWN");

  const accountSearch = await request(
    `/api/v1/social/accounts?q=${encodeURIComponent(commercial.account.username)}`,
    { auth: personal },
  );
  assert.equal(accountSearch.response.status, 200, JSON.stringify(accountSearch.body));

  await pool.query(
    `UPDATE ${quoteGeneratedSchema(schemaName)}.accounts
     SET username_changed_at = now() - interval '31 days'
     WHERE id = $1`,
    [personal.account.id],
  );
  const currentPersonal = await request("/api/v1/accounts/me", { auth: personal });
  const currentCommercial = await request("/api/v1/accounts/me", { auth: commercial });
  const contestedUsername = `race_${suffix}`;
  const concurrentUsernameChanges = await Promise.all([
    request("/api/v1/accounts/me", {
      method: "PATCH",
      auth: personal,
      body: {
        username: contestedUsername,
        version: currentPersonal.body.account.version,
      },
    }),
    request("/api/v1/accounts/me", {
      method: "PATCH",
      auth: commercial,
      body: {
        username: contestedUsername,
        version: currentCommercial.body.account.version,
      },
    }),
  ]);
  assert.deepEqual(
    concurrentUsernameChanges.map((result) => result.response.status).sort(),
    [200, 409],
  );
  const rejectedConcurrentUsernameChange = concurrentUsernameChanges.find((result) => result.response.status === 409);
  assert.equal(rejectedConcurrentUsernameChange?.body.error.key, "USERNAME_UNAVAILABLE");
  const personalAfterConcurrentRename = await request("/api/v1/accounts/me", { auth: personal });
  assert.equal(personalAfterConcurrentRename.response.status, 200);
  const currentPersonalUsername = personalAfterConcurrentRename.body.account.username;
  assert.ok([`pnew_${suffix}`, contestedUsername].includes(currentPersonalUsername));
  assert.ok(accountSearch.body.items.some((account) => account.id === commercial.account.id));
  const unauthenticatedSearch = await request(
    `/api/v1/social/accounts?q=${encodeURIComponent(commercial.account.username)}`,
  );
  assert.equal(unauthenticatedSearch.response.status, 401);
  const shortSearch = await request("/api/v1/social/accounts?q=x", { auth: personal });
  assert.equal(shortSearch.response.status, 400);
  const wildcardSearch = await request("/api/v1/social/accounts?q=%25%25", { auth: personal });
  assert.equal(wildcardSearch.response.status, 200);
  assert.deepEqual(wildcardSearch.body.items, []);

  const [businessProfile] = await db
    .select({ cityName: commercialProfiles.cityName, categoryKey: commercialProfiles.categoryKey })
    .from(commercialProfiles)
    .where(eq(commercialProfiles.accountId, commercial.account.id));
  assert.deepEqual(businessProfile, { cityName: "Campinas", categoryKey: "cafes" });

  const privacy = await request("/api/v1/accounts/me/privacy", { auth: personal });
  assert.equal(privacy.response.status, 200);
  const privateProfile = await request("/api/v1/accounts/me/privacy", {
    method: "PUT",
    auth: personal,
    body: {
      profileVisibility: "private",
      messages: "circle",
      readReceipts: false,
      version: privacy.body.version,
    },
  });
  assert.equal(privateProfile.response.status, 200, JSON.stringify(privateProfile.body));

  const followRequest = await request(`/api/v1/social/accounts/${personal.account.id}/follow`, {
    method: "PUT",
    auth: commercial,
  });
  assert.equal(followRequest.response.status, 200);
  assert.equal(followRequest.body.status, "pending");
  const createdPublicPost = await request("/api/v1/social/posts", {
    method: "POST",
    auth: personal,
    body: {
      content: "Publicação de teste",
      audience: "public",
    },
  });
  assert.equal(createdPublicPost.response.status, 201, JSON.stringify(createdPublicPost.body));
  assert.equal(createdPublicPost.body.authorId, personal.account.id);
  assert.equal(createdPublicPost.body.format, "text");
  assert.equal(createdPublicPost.body.likes, 0);
  const createdCirclePost = await request("/api/v1/social/posts", {
    method: "POST",
    auth: personal,
    body: {
      content: "Publicação do Círculo",
      audience: "circles",
    },
  });
  assert.equal(createdCirclePost.response.status, 201);
  const createdPrivatePost = await request("/api/v1/social/posts", {
    method: "POST",
    auth: personal,
    body: {
      content: "Publicação só para a titular",
      audience: "private",
    },
  });
  assert.equal(createdPrivatePost.response.status, 201);
  const createdArticle = await request("/api/v1/social/articles", {
    method: "POST",
    auth: personal,
    body: {
      audience: "public",
      article: {
        title: "Artigo de teste",
        body: "Texto do artigo de teste.",
      },
    },
  });
  assert.equal(createdArticle.response.status, 201, JSON.stringify(createdArticle.body));
  assert.equal(createdArticle.body.format, "article");
  assert.equal(createdArticle.body.article.title, "Artigo de teste");
  const firstOwnerPostPage = await request(
    `/api/v1/social/accounts/${personal.account.id}/posts?limit=1&format=all`,
    { auth: personal },
  );
  assert.equal(firstOwnerPostPage.response.status, 200);
  assert.equal(firstOwnerPostPage.body.items.length, 1);
  assert.ok(firstOwnerPostPage.body.nextCursor);
  const secondOwnerPostPage = await request(
    `/api/v1/social/accounts/${personal.account.id}/posts?limit=1&format=all&cursor=${encodeURIComponent(firstOwnerPostPage.body.nextCursor)}`,
    { auth: personal },
  );
  assert.equal(secondOwnerPostPage.response.status, 200);
  assert.equal(secondOwnerPostPage.body.items.length, 1);
  assert.notEqual(secondOwnerPostPage.body.items[0].id, firstOwnerPostPage.body.items[0].id);
  const reusedCursor = await request(
    `/api/v1/social/accounts/${commercial.account.id}/posts?limit=1&format=all&cursor=${encodeURIComponent(firstOwnerPostPage.body.nextCursor)}`,
    { auth: personal },
  );
  assert.equal(reusedCursor.response.status, 400);

  const forgedPost = await request("/api/v1/social/posts", {
    method: "POST",
    auth: commercial,
    body: {
      authorId: personal.account.id,
      content: "Tentativa de publicar em outra conta",
      audience: "public",
    },
  });
  assert.equal(forgedPost.response.status, 403);
  assert.equal(forgedPost.body.error.key, "CONTENT_AUTHOR_MISMATCH");
  const unsupportedMediaPost = await request("/api/v1/social/posts", {
    method: "POST",
    auth: personal,
    body: {
      content: "",
      audience: "public",
      format: "media",
      mediaUrls: ["blob:local-only"],
      mediaTypes: ["image"],
    },
  });
  assert.equal(unsupportedMediaPost.response.status, 422);
  assert.equal(unsupportedMediaPost.body.error.key, "CONTENT_MEDIA_NOT_READY");

  const deniedPendingPost = await request(`/api/v1/social/posts/${createdPublicPost.body.id}`, {
    auth: commercial,
  });
  assert.equal(deniedPendingPost.response.status, 404);
  const deniedPendingArticle = await request(`/api/v1/social/articles/${createdArticle.body.id}`, {
    auth: commercial,
  });
  assert.equal(deniedPendingArticle.response.status, 404);
  const deniedPendingProfilePosts = await request(
    `/api/v1/social/accounts/${personal.account.id}/posts?format=all`,
    { auth: commercial },
  );
  assert.equal(deniedPendingProfilePosts.response.status, 200);
  assert.deepEqual(deniedPendingProfilePosts.body.items, []);
  const currentProfileIdentity = await pool.query(
    `SELECT account.username, account.status, email.verified_at
     FROM ${quoteGeneratedSchema(schemaName)}.accounts AS account
     INNER JOIN ${quoteGeneratedSchema(schemaName)}.account_emails AS email
       ON email.account_id = account.id
     WHERE account.id = $1`,
    [personal.account.id],
  );
  assert.equal(currentProfileIdentity.rowCount, 1);
  assert.equal(currentProfileIdentity.rows[0].username, currentPersonalUsername);
  assert.equal(currentProfileIdentity.rows[0].status, "active");
  assert.ok(currentProfileIdentity.rows[0].verified_at);
  const profileBlocksBeforeBlockTest = await pool.query(
    `SELECT 1 FROM ${quoteGeneratedSchema(schemaName)}.account_blocks
     WHERE (blocker_id = $1 AND blocked_id = $2)
        OR (blocker_id = $2 AND blocked_id = $1)`,
    [personal.account.id, commercial.account.id],
  );
  assert.equal(profileBlocksBeforeBlockTest.rowCount, 0);
  const profileWhileRequestPending = await request(`/api/v1/profiles/${currentPersonalUsername}`, {
    auth: commercial,
  });
  assert.equal(profileWhileRequestPending.response.status, 200, JSON.stringify(profileWhileRequestPending.body));
  assert.equal(profileWhileRequestPending.body.visibility.canViewPublicContent, false);
  assert.equal(profileWhileRequestPending.body.visibility.canViewCircleContent, false);
  const privateFollowersBeforeApproval = await request(
    `/api/v1/social/accounts/${personal.account.id}/followers`,
    { auth: commercial },
  );
  assert.equal(privateFollowersBeforeApproval.response.status, 403);

  const requests = await request("/api/v1/social/follow-requests", { auth: personal });
  assert.ok(requests.body.items.some((item) => item.account.id === commercial.account.id));

  const accepted = await request(`/api/v1/social/follow-requests/${commercial.account.id}/accept`, {
    method: "POST",
    auth: personal,
  });
  assert.equal(accepted.response.status, 200);
  assert.equal(accepted.body.status, "accepted");
  const profileAfterApproval = await request(`/api/v1/profiles/${currentPersonalUsername}`, {
    auth: commercial,
  });
  assert.equal(profileAfterApproval.response.status, 200);
  assert.equal(profileAfterApproval.body.visibility.canViewPublicContent, true);
  assert.equal(profileAfterApproval.body.visibility.canViewCircleContent, false);
  assert.ok(profileAfterApproval.body.posts.items.some((post) => post.id === createdPublicPost.body.id));
  assert.ok(profileAfterApproval.body.articles.items.some((post) => post.id === createdArticle.body.id));
  assert.ok(!profileAfterApproval.body.posts.items.some((post) => post.id === createdCirclePost.body.id));
  const deniedPrivatePost = await request(`/api/v1/social/posts/${createdPrivatePost.body.id}`, {
    auth: commercial,
  });
  assert.equal(deniedPrivatePost.response.status, 404);

  const reciprocalFollow = await request(`/api/v1/social/accounts/${commercial.account.id}/follow`, {
    method: "PUT",
    auth: personal,
  });
  assert.equal(reciprocalFollow.response.status, 200);
  assert.equal(reciprocalFollow.body.status, "accepted");

  const personalCircle = await request("/api/v1/social/circles", { auth: personal });
  assert.ok(personalCircle.body.items.some((item) => item.account.id === commercial.account.id && item.isMutual));
  const commercialCircle = await request("/api/v1/social/circles", { auth: commercial });
  assert.ok(commercialCircle.body.items.some((item) => item.account.id === personal.account.id && item.isMutual));
  const profileAfterMutualFollow = await request(`/api/v1/profiles/${currentPersonalUsername}`, {
    auth: commercial,
  });
  assert.equal(profileAfterMutualFollow.body.visibility.canViewCircleContent, true);
  const visibleCirclePost = await request(`/api/v1/social/posts/${createdCirclePost.body.id}`, {
    auth: commercial,
  });
  assert.equal(visibleCirclePost.response.status, 200);
  const ownerPrivatePost = await request(`/api/v1/social/posts/${createdPrivatePost.body.id}`, {
    auth: personal,
  });
  assert.equal(ownerPrivatePost.response.status, 200);
  const articleRead = await request(`/api/v1/social/articles/${createdArticle.body.id}`, {
    auth: commercial,
  });
  assert.equal(articleRead.response.status, 200);

  const deniedDeleteByOtherAccount = await request(`/api/v1/social/posts/${createdPublicPost.body.id}`, {
    method: "DELETE",
    auth: commercial,
  });
  assert.equal(deniedDeleteByOtherAccount.response.status, 404);

  await request(`/api/v1/social/accounts/${personal.account.id}/follow`, {
    method: "DELETE",
    auth: commercial,
  });
  await request(`/api/v1/social/accounts/${commercial.account.id}/follow`, {
    method: "DELETE",
    auth: personal,
  });
  const [followDuringBlock, blocked] = await Promise.all([
    request(`/api/v1/social/accounts/${personal.account.id}/follow`, {
      method: "PUT",
      auth: commercial,
    }),
    request(`/api/v1/social/blocks/${commercial.account.id}`, {
      method: "PUT",
      auth: personal,
    }),
  ]);
  assert.equal(blocked.response.status, 204);
  assert.ok([200, 404].includes(followDuringBlock.response.status));
  const relationshipsAfterConcurrentBlock = await db
    .select()
    .from(accountFollows)
    .where(eq(accountFollows.followerId, commercial.account.id));
  assert.ok(!relationshipsAfterConcurrentBlock.some((row) => row.followedId === personal.account.id));
  const requestsAfterConcurrentBlock = await db
    .select()
    .from(accountFollowRequests)
    .where(eq(accountFollowRequests.requesterId, commercial.account.id));
  assert.ok(!requestsAfterConcurrentBlock.some((row) => row.targetId === personal.account.id));
  const searchAfterBlock = await request(
    `/api/v1/social/accounts?q=${encodeURIComponent(commercial.account.username)}`,
    { auth: personal },
  );
  assert.equal(searchAfterBlock.response.status, 200);
  assert.ok(!searchAfterBlock.body.items.some((account) => account.id === commercial.account.id));
  const reverseSearchAfterBlock = await request(
    `/api/v1/social/accounts?q=${encodeURIComponent(currentPersonalUsername)}`,
    { auth: commercial },
  );
  assert.equal(reverseSearchAfterBlock.response.status, 200);
  assert.ok(!reverseSearchAfterBlock.body.items.some((account) => account.id === personal.account.id));
  const blockerCannotViewBlockedProfile = await request(
    `/api/v1/profiles/${commercial.account.username}`,
    { auth: personal },
  );
  assert.equal(blockerCannotViewBlockedProfile.response.status, 404);
  const blockedCannotViewBlockerProfile = await request(
    `/api/v1/profiles/${currentPersonalUsername}`,
    { auth: commercial },
  );
  assert.equal(blockedCannotViewBlockerProfile.response.status, 404);
  const blockedCannotReadRelationshipList = await request(
    `/api/v1/social/accounts/${personal.account.id}/followers`,
    { auth: commercial },
  );
  assert.equal(blockedCannotReadRelationshipList.response.status, 404);
  const blockedAccountCannotListBlocker = await request("/api/v1/social/blocks", { auth: commercial });
  assert.deepEqual(blockedAccountCannotListBlocker.body.items, []);
  const blockedRelationship = await request(`/api/v1/social/accounts/${personal.account.id}/follow`, {
    method: "PUT",
    auth: commercial,
  });
  assert.equal(blockedRelationship.response.status, 404);

  const reverseUnblockAttempt = await request(`/api/v1/social/blocks/${personal.account.id}`, {
    method: "DELETE",
    auth: commercial,
  });
  assert.equal(reverseUnblockAttempt.response.status, 204);
  const stillBlocked = await request("/api/v1/social/blocks", { auth: personal });
  assert.ok(stillBlocked.body.items.some((item) => item.id === commercial.account.id));

  const unblocked = await request(`/api/v1/social/blocks/${commercial.account.id}`, {
    method: "DELETE",
    auth: personal,
  });
  assert.equal(unblocked.response.status, 204);
  const circleAfterUnblock = await request("/api/v1/social/circles", { auth: personal });
  assert.ok(!circleAfterUnblock.body.items.some((item) => item.account.id === commercial.account.id));

  const pendingAgain = await request(`/api/v1/social/accounts/${personal.account.id}/follow`, {
    method: "PUT",
    auth: commercial,
  });
  assert.equal(pendingAgain.response.status, 200);
  assert.equal(pendingAgain.body.status, "pending");
  const [acceptDuringBlock, reblocked] = await Promise.all([
    request(`/api/v1/social/follow-requests/${commercial.account.id}/accept`, {
      method: "POST",
      auth: personal,
    }),
    request(`/api/v1/social/blocks/${commercial.account.id}`, {
      method: "PUT",
      auth: personal,
    }),
  ]);
  assert.equal(reblocked.response.status, 204);
  assert.ok([200, 404].includes(acceptDuringBlock.response.status));
  const hiddenPostAfterBlock = await request(`/api/v1/social/posts/${createdPublicPost.body.id}`, {
    auth: commercial,
  });
  assert.equal(hiddenPostAfterBlock.response.status, 404);
  const ownerDelete = await request(`/api/v1/social/posts/${createdPrivatePost.body.id}`, {
    method: "DELETE",
    auth: personal,
  });
  assert.equal(ownerDelete.response.status, 204);
  const [deletedPrivatePost] = await db.select().from(feedPosts)
    .where(eq(feedPosts.id, createdPrivatePost.body.id));
  assert.equal(deletedPrivatePost, undefined);
  const relationshipsAfterAcceptRace = await db
    .select()
    .from(accountFollows)
    .where(eq(accountFollows.followerId, commercial.account.id));
  assert.ok(!relationshipsAfterAcceptRace.some((row) => row.followedId === personal.account.id));
  const requestsAfterBlock = await request("/api/v1/social/follow-requests", { auth: personal });
  assert.deepEqual(requestsAfterBlock.body.items, []);

  assert.equal(emailMessages.length, 3, "Personal, commercial and reclaimed-username verifications must use the test sink.");
  assert.equal(await publicSchemaFingerprint(), publicSchemaBefore, "API tests changed the public schema.");
});

test("unknown installations require email confirmation; password changes revoke every trusted installation", async () => {
  const suffix = randomUUID().slice(0, 8);
  const password = "A01_Device_Test_2026!";
  const clientIp = "203.0.113.90";
  const preAuth = await createPreAuth();
  const pending = await registerAccount({
    accountType: "personal",
    firstName: "Conta",
    lastName: "Dispositivo",
    username: `device_${suffix}`,
    email: `device-${suffix}@example.com`,
    age: 29,
    password,
    passwordConfirmation: password,
    acceptedTermsVersion: "v1",
  }, preAuth, clientIp);
  const account = await confirmAccount(pending, preAuth, clientIp);

  const newBrowser = await createPreAuth();
  const messageCount = deviceLoginMessages.length;
  const challenge = await request("/api/v1/auth/login", {
    method: "POST",
    body: { identifier: pending.email, password },
    auth: newBrowser,
    clientIp,
    autoDeviceVerification: false,
  });
  assert.equal(challenge.response.status, 202, JSON.stringify(challenge.body));
  assert.equal(challenge.body.status, "device_verification_required");
  assert.equal(deviceLoginMessages.length, messageCount + 1);
  assert.equal(responseCookies(challenge.response).some((cookie) => cookie.startsWith("__Host-seekalive_session=")), false);
  assert.equal((await request("/api/v1/auth/session", { auth: newBrowser, clientIp })).body.authenticated, false);

  const deliveredCode = deviceLoginMessages.at(-1).code;
  const wrongCode = deliveredCode === "000000" ? "000001" : "000000";
  const wrongAttempt = await request("/api/v1/auth/device-verification/confirm", {
    method: "POST",
    body: { challengeId: challenge.body.challengeId, code: wrongCode },
    auth: newBrowser,
    clientIp,
  });
  assert.equal(wrongAttempt.response.status, 400);
  assert.equal(wrongAttempt.body.error.key, "INVALID_DEVICE_CODE");
  assert.equal(wrongAttempt.body.error.attemptsRemaining, 2);

  await db
    .update(authChallenges)
    .set({ resendAvailableAt: new Date(Date.now() - 1000) })
    .where(eq(authChallenges.id, challenge.body.challengeId));
  const resent = await request("/api/v1/auth/device-verification/resend", {
    method: "POST",
    body: { challengeId: challenge.body.challengeId },
    auth: newBrowser,
    clientIp,
  });
  assert.equal(resent.response.status, 200, JSON.stringify(resent.body));
  const confirmed = await request("/api/v1/auth/device-verification/confirm", {
    method: "POST",
    body: { challengeId: challenge.body.challengeId, code: deviceLoginMessages.at(-1).code },
    auth: newBrowser,
    clientIp,
  });
  assert.equal(confirmed.response.status, 200, JSON.stringify(confirmed.body));
  assert.equal(confirmed.body.account.id, account.account.id);
  assert.equal((await request("/api/v1/auth/session", { auth: newBrowser, clientIp })).body.authenticated, true);

  const devices = await request("/api/v1/auth/devices", { auth: newBrowser, clientIp });
  assert.equal(devices.response.status, 200);
  assert.equal(devices.body.items.length, 2);
  assert.equal(devices.body.items.filter((device) => device.isCurrent).length, 1);

  const passwordUpdate = await request("/api/v1/auth/password/update", {
    method: "POST",
    body: {
      identifier: pending.email,
      currentPassword: password,
      newPassword: "B02_Device_Updated_2026!",
      passwordConfirmation: "B02_Device_Updated_2026!",
    },
    auth: newBrowser,
    clientIp,
    autoCompletePasswordUpdate: false,
  });
  assert.equal(passwordUpdate.response.status, 202, JSON.stringify(passwordUpdate.body));
  assert.equal(passwordUpdate.body.status, "password_update_verification_required");
  const passwordUpdateCode = passwordUpdateMessages.at(-1).code;
  const passwordUpdateConfirmed = await request("/api/v1/auth/password/update/confirm", {
    method: "POST",
    body: { challengeId: passwordUpdate.body.challengeId, code: passwordUpdateCode },
    auth: newBrowser,
    clientIp,
  });
  assert.equal(passwordUpdateConfirmed.response.status, 200, JSON.stringify(passwordUpdateConfirmed.body));

  const activeDevices = await db
    .select({ id: trustedDevices.id })
    .from(trustedDevices)
    .where(and(eq(trustedDevices.accountId, account.account.id), isNull(trustedDevices.revokedAt)));
  assert.equal(activeDevices.length, 0);
  const activeSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.accountId, account.account.id), isNull(sessions.revokedAt)));
  assert.equal(activeSessions.length, 0);

  const reauth = await createPreAuth();
  const afterPasswordChange = await request("/api/v1/auth/login", {
    method: "POST",
    body: { identifier: pending.email, password: "B02_Device_Updated_2026!" },
    auth: reauth,
    clientIp,
    autoDeviceVerification: false,
  });
  assert.equal(afterPasswordChange.response.status, 202);
  assert.equal(afterPasswordChange.body.status, "device_verification_required");
});

test("three incorrect device codes lock the account and expose the configured support contact", async () => {
  const suffix = randomUUID().slice(0, 8);
  const password = "A01_Lock_Test_2026!";
  const clientIp = "203.0.113.91";
  const preAuth = await createPreAuth();
  const pending = await registerAccount({
    accountType: "personal",
    firstName: "Conta",
    lastName: "Bloqueada",
    username: `locked_${suffix}`,
    email: `locked-${suffix}@example.com`,
    age: 31,
    password,
    passwordConfirmation: password,
    acceptedTermsVersion: "v1",
  }, preAuth, clientIp);
  const account = await confirmAccount(pending, preAuth, clientIp);
  const newBrowser = await createPreAuth();
  const challenge = await request("/api/v1/auth/login", {
    method: "POST",
    body: { identifier: pending.email, password },
    auth: newBrowser,
    clientIp,
    autoDeviceVerification: false,
  });
  assert.equal(challenge.response.status, 202);
  const correctCode = deviceLoginMessages.at(-1).code;
  const wrongCode = correctCode === "000000" ? "000001" : "000000";
  let lockResponse;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = await request("/api/v1/auth/device-verification/confirm", {
      method: "POST",
      body: { challengeId: challenge.body.challengeId, code: wrongCode },
      auth: newBrowser,
      clientIp,
    });
    assert.equal(result.response.status, attempt === 3 ? 423 : 400, JSON.stringify(result.body));
    if (attempt < 3) assert.equal(result.body.error.attemptsRemaining, 3 - attempt);
    if (attempt === 3) lockResponse = result.response;
  }
  assert.ok(lockResponse);
  assert.equal(
    responseCookies(lockResponse).some((cookie) =>
      cookie.startsWith("__Host-seekalive_device=") && /Expires=Thu, 01 Jan 1970/i.test(cookie)),
    true,
  );

  const [lockedAccount] = await db
    .select({ securityLockedAt: accounts.securityLockedAt })
    .from(accounts)
    .where(eq(accounts.id, account.account.id));
  assert.ok(lockedAccount.securityLockedAt);
  const blockedLogin = await request("/api/v1/auth/login", {
    method: "POST",
    body: { identifier: pending.email, password },
    auth: await createPreAuth(),
    clientIp,
  });
  assert.equal(blockedLogin.response.status, 423);
  assert.equal(blockedLogin.body.error.key, "SECURITY_LOCKED");
  assert.equal(blockedLogin.body.error.supportEmail, "admseekalive@gmail.com");
});

test("authenticated e-mail and password changes verify both mailboxes and revoke trusted sessions", async () => {
  const suffix = randomUUID().slice(0, 8);
  const clientIp = "203.0.113.113";
  const currentPassword = "B01_Account_Change_2026!";
  const newPassword = "B02_Account_Change_2026!";
  const currentEmail = `change-${suffix}@example.com`;
  const newEmail = `changed-${suffix}@example.com`;
  const preAuth = await createPreAuth();
  const pending = await registerAccount({
    accountType: "personal",
    firstName: "Conta",
    lastName: "Alteracao",
    username: `change_${suffix}`,
    email: currentEmail,
    age: 32,
    password: currentPassword,
    passwordConfirmation: currentPassword,
    acceptedTermsVersion: "v1",
  }, preAuth, clientIp);
  const account = await confirmAccount(pending, preAuth, clientIp);

  const malformedEmail = await request("/api/v1/auth/account/email/change/request", {
    method: "POST",
    body: { currentPassword, newEmail: "not-an-email" },
    auth: account,
    clientIp,
  });
  assert.equal(malformedEmail.response.status, 400);
  const wrongCurrentPassword = await request("/api/v1/auth/account/email/change/request", {
    method: "POST",
    body: { currentPassword: "Incorrect_Password_2026!", newEmail },
    auth: account,
    clientIp,
  });
  assert.equal(wrongCurrentPassword.response.status, 401);
  assert.equal(wrongCurrentPassword.body.error.key, "INVALID_CURRENT_PASSWORD");

  const emailRequest = await request("/api/v1/auth/account/email/change/request", {
    method: "POST",
    body: { currentPassword, newEmail },
    auth: account,
    clientIp,
  });
  assert.equal(emailRequest.response.status, 202, JSON.stringify(emailRequest.body));
  assert.equal(emailRequest.body.status, "current_email_verification_required");
  const currentEmailCode = accountEmailChangeCurrentMessages.at(-1);
  assert.equal(currentEmailCode.email, currentEmail);

  const wrongCurrentCode = currentEmailCode.code === "000000" ? "000001" : "000000";
  const rejectedCurrentCode = await request("/api/v1/auth/account/email/change/confirm-current", {
    method: "POST",
    body: { challengeId: emailRequest.body.challengeId, code: wrongCurrentCode },
    auth: account,
    clientIp,
  });
  assert.equal(rejectedCurrentCode.response.status, 400);

  const currentEmailConfirmed = await request("/api/v1/auth/account/email/change/confirm-current", {
    method: "POST",
    body: { challengeId: emailRequest.body.challengeId, code: currentEmailCode.code },
    auth: account,
    clientIp,
  });
  assert.equal(currentEmailConfirmed.response.status, 202, JSON.stringify(currentEmailConfirmed.body));
  assert.equal(currentEmailConfirmed.body.status, "new_email_verification_required");
  const newEmailCode = accountEmailChangeNewMessages.at(-1);
  assert.equal(newEmailCode.email, newEmail);

  const wrongNewCode = newEmailCode.code === "000000" ? "000001" : "000000";
  const rejectedNewCode = await request("/api/v1/auth/account/email/change/confirm-new", {
    method: "POST",
    body: { challengeId: currentEmailConfirmed.body.challengeId, code: wrongNewCode },
    auth: account,
    clientIp,
  });
  assert.equal(rejectedNewCode.response.status, 400);

  const [emailBeforeFinalCode] = await db
    .select({ email: accountEmails.emailNormalized })
    .from(accountEmails)
    .where(eq(accountEmails.accountId, account.account.id));
  assert.equal(emailBeforeFinalCode.email, currentEmail);

  const newEmailConfirmed = await request("/api/v1/auth/account/email/change/confirm-new", {
    method: "POST",
    body: { challengeId: currentEmailConfirmed.body.challengeId, code: newEmailCode.code },
    auth: account,
    clientIp,
  });
  assert.equal(newEmailConfirmed.response.status, 200, JSON.stringify(newEmailConfirmed.body));
  assert.equal(newEmailConfirmed.body.status, "email_changed");
  assert.equal(newEmailConfirmed.body.email, newEmail);
  assert.equal(newEmailConfirmed.body.securityNoticeSent, true);
  assert.equal(accountEmailChangeSecurityNotices.at(-1).email, currentEmail);

  const [emailAfterConfirmation] = await db
    .select({ email: accountEmails.emailNormalized })
    .from(accountEmails)
    .where(eq(accountEmails.accountId, account.account.id));
  assert.equal(emailAfterConfirmation.email, newEmail);
  const consumedEmailChanges = await db
    .select({ pendingEmail: authChallenges.pendingEmail })
    .from(authChallenges)
    .where(and(
      eq(authChallenges.accountId, account.account.id),
      inArray(authChallenges.purpose, ["account_email_change_current", "account_email_change_new"]),
    ));
  assert.ok(consumedEmailChanges.length >= 2);
  assert.ok(consumedEmailChanges.every((challenge) => challenge.pendingEmail === null));

  const passwordRequest = await request("/api/v1/auth/account/password/change/request", {
    method: "POST",
    body: {
      currentPassword,
      newPassword,
      passwordConfirmation: newPassword,
    },
    auth: account,
    clientIp,
  });
  assert.equal(passwordRequest.response.status, 202, JSON.stringify(passwordRequest.body));
  assert.equal(passwordRequest.body.status, "password_change_verification_required");
  assert.equal(accountPasswordChangeMessages.at(-1).email, newEmail);

  const passwordChangeMessage = accountPasswordChangeMessages.at(-1);
  const wrongPasswordCode = passwordChangeMessage.code === "000000" ? "000001" : "000000";
  const rejectedPasswordCode = await request("/api/v1/auth/account/password/change/confirm", {
    method: "POST",
    body: { challengeId: passwordRequest.body.challengeId, code: wrongPasswordCode },
    auth: account,
    clientIp,
  });
  assert.equal(rejectedPasswordCode.response.status, 400);

  const passwordConfirmed = await request("/api/v1/auth/account/password/change/confirm", {
    method: "POST",
    body: {
      challengeId: passwordRequest.body.challengeId,
      code: passwordChangeMessage.code,
    },
    auth: account,
    clientIp,
  });
  assert.equal(passwordConfirmed.response.status, 200, JSON.stringify(passwordConfirmed.body));
  assert.equal(passwordConfirmed.body.status, "password_changed");
  const activeSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.accountId, account.account.id), isNull(sessions.revokedAt)));
  assert.equal(activeSessions.length, 0);
  const activeDevices = await db
    .select({ id: trustedDevices.id })
    .from(trustedDevices)
    .where(and(eq(trustedDevices.accountId, account.account.id), isNull(trustedDevices.revokedAt)));
  assert.equal(activeDevices.length, 0);
  const consumedPasswordChanges = await db
    .select({
      pendingPasswordHash: authChallenges.pendingPasswordHash,
      basePasswordHash: authChallenges.basePasswordHash,
    })
    .from(authChallenges)
    .where(and(
      eq(authChallenges.accountId, account.account.id),
      eq(authChallenges.purpose, "account_password_change"),
    ));
  assert.ok(consumedPasswordChanges.length >= 1);
  assert.ok(consumedPasswordChanges.every(
    (challenge) => challenge.pendingPasswordHash === null && challenge.basePasswordHash === null,
  ));

  const nextLogin = await request("/api/v1/auth/login", {
    method: "POST",
    body: { identifier: newEmail, password: newPassword },
    auth: await createPreAuth(),
    clientIp,
    autoDeviceVerification: false,
  });
  assert.equal(nextLogin.response.status, 202, JSON.stringify(nextLogin.body));
  assert.equal(nextLogin.body.status, "device_verification_required");
  assert.equal(deviceLoginMessages.at(-1).email, newEmail);
});
