import assert from "node:assert/strict";
import { once } from "node:events";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { after, before, test } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, isNull } from "drizzle-orm";

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
  accounts,
  authChallenges,
  commercialProfiles,
  db,
  passwordCredentials,
  pool,
  sessions,
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
  accountInterests,
  accountFollows,
  accountFollowRequests,
  accountBlocks,
];
const expectedTables = [
  "account_blocks",
  "account_emails",
  "account_follow_requests",
  "account_follows",
  "account_interests",
  "accounts",
  "auth_challenges",
  "business_profiles",
  "password_credentials",
  "sessions",
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
    env: { ...process.env, NODE_ENV: "test", SEEKALIVE_DB_SCHEMA: schemaName },
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

async function request(path, { method = "GET", body, auth } = {}) {
  const headers = new Headers();
  if (body !== undefined) headers.set("content-type", "application/json");
  if (auth?.cookie) headers.set("cookie", auth.cookie);
  if (auth?.csrfToken) headers.set("x-csrf-token", auth.csrfToken);
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return {
    response,
    body: text ? JSON.parse(text) : null,
  };
}

async function createPreAuth() {
  const { response, body } = await request("/api/v1/auth/csrf");
  assert.equal(response.status, 200);
  assert.equal(typeof body.csrfToken, "string");
  return {
    cookie: cookieValue(response, "__Host-seekalive_pre_auth"),
    csrfToken: body.csrfToken,
  };
}

async function registerAccount(registration, preAuth) {
  const { response, body } = await request("/api/v1/auth/register", {
    method: "POST",
    body: registration,
    auth: preAuth,
  });
  assert.equal(response.status, 202, JSON.stringify(body));
  assert.equal(body.status, "verification_required");
  const email = registration.email.toLowerCase();
  const message = emailMessages.findLast((item) => item.email === email);
  assert.ok(message, "The test email sink should capture the verification message.");
  return { email, password: registration.password, message };
}

async function confirmAccount(pending, preAuth) {
  const { response, body } = await request("/api/v1/auth/verification/confirm", {
    method: "POST",
    body: { email: pending.email, code: pending.message.code },
    auth: preAuth,
  });
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.emailVerified, true);
  return {
    account: body.account,
    cookie: cookieValue(response, "__Host-seekalive_session"),
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
  assert.equal(loginBeforeVerification.body.error.code, "EMAIL_NOT_VERIFIED");

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
  assert.equal(legacyLogin.body.error.code, "PASSWORD_UPDATE_REQUIRED");
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
  assert.equal(wrongResetCode.body.error.code, "INVALID_PASSWORD_RESET");

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
  assert.equal(responseCookies(resetPassword.response).some((cookie) => cookie.startsWith("__Host-seekalive_session=")), false);
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
  assert.equal(replayedResetCode.body.error.code, "INVALID_PASSWORD_RESET");

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
  assert.equal(expiredResetConfirmation.body.error.code, "INVALID_PASSWORD_RESET");

  const currentSession = await request("/api/v1/auth/session", { auth: personal });
  assert.equal(currentSession.response.status, 200);
  assert.equal(currentSession.body.authenticated, true);
  const personalOwnerProfile = await request("/api/v1/accounts/me", { auth: personal });
  assert.equal(personalOwnerProfile.response.status, 200, JSON.stringify(personalOwnerProfile.body));
  assert.equal(personalOwnerProfile.body.email, personalRegistration.email.toLowerCase());
  assert.equal(personalOwnerProfile.body.age, 18);
  assert.equal(personalOwnerProfile.body.firstName, "Conta");
  assert.equal(personalOwnerProfile.body.lastName, "Isolada");
  assert.equal(personalOwnerProfile.body.commercialProfile, null);
  assert.equal("email" in personalOwnerProfile.body.account, false);
  assert.equal("age" in personalOwnerProfile.body.account, false);

  const updatedPersonalProfile = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: personal,
    body: {
      firstName: "Conta Revisada",
      lastName: "Isolada",
      age: 19,
      version: personalOwnerProfile.body.account.version,
    },
  });
  assert.equal(updatedPersonalProfile.response.status, 200, JSON.stringify(updatedPersonalProfile.body));
  assert.equal(updatedPersonalProfile.body.account.displayName, "Conta Revisada Isolada");
  assert.equal(updatedPersonalProfile.body.firstName, "Conta Revisada");
  assert.equal(updatedPersonalProfile.body.age, 19);
  assert.equal(updatedPersonalProfile.body.email, personalRegistration.email.toLowerCase());

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
  assert.equal(personalCommercialFieldAttempt.body.error.code, "ACCOUNT_FIELD_NOT_ALLOWED");

  const personalUnderageAttempt = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: personal,
    body: { age: 17, version: updatedPersonalProfile.body.account.version },
  });
  assert.equal(personalUnderageAttempt.response.status, 400);

  const personalStaleVersionAttempt = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: personal,
    body: { age: 20, version: personalOwnerProfile.body.account.version },
  });
  assert.equal(personalStaleVersionAttempt.response.status, 409);
  assert.equal(personalStaleVersionAttempt.body.error.code, "VERSION_CONFLICT");

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
  assert.equal("commercialProfile" in publicProfile.body.account, false);
  assert.equal("address" in publicProfile.body.account, false);
  assert.equal("email" in publicProfile.body.account, false);
  assert.equal("age" in publicProfile.body.account, false);
  const commercialOwnerProfile = await request("/api/v1/accounts/me", { auth: commercial });
  assert.equal(commercialOwnerProfile.response.status, 200, JSON.stringify(commercialOwnerProfile.body));
  assert.equal(commercialOwnerProfile.body.account.id, commercial.account.id);
  assert.equal(commercialOwnerProfile.body.email, commercialRegistration.email.toLowerCase());
  assert.equal(commercialOwnerProfile.body.age, 35);
  assert.deepEqual(commercialOwnerProfile.body.commercialProfile, {
    categoryKey: "cafes",
    discoveryKind: "place",
    address: "Rua de Teste, 100",
    postalCode: "01001000",
    cityName: "São Paulo",
    stateName: "SP",
    countryName: "Brasil",
  });

  const usernameAlreadyTaken = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: personal,
    body: {
      username: commercial.account.username,
      version: updatedPersonalProfile.body.account.version,
    },
  });
  assert.equal(usernameAlreadyTaken.response.status, 409);
  assert.equal(usernameAlreadyTaken.body.error.code, "USERNAME_UNAVAILABLE");

  const updatedCommercialProfile = await request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: commercial,
    body: {
      displayName: "Comércio Revisado A02",
      age: 36,
      commercialProfile: {
        address: "Avenida de Teste, 200",
        postalCode: "04567000",
        cityName: "Campinas",
        stateName: "Rio de Janeiro",
        countryName: "Brasil",
      },
      version: commercialOwnerProfile.body.account.version,
    },
  });
  assert.equal(updatedCommercialProfile.response.status, 200, JSON.stringify(updatedCommercialProfile.body));
  assert.equal(updatedCommercialProfile.body.account.displayName, "Comércio Revisado A02");
  assert.equal(updatedCommercialProfile.body.age, 36);
  assert.deepEqual(updatedCommercialProfile.body.commercialProfile, {
    categoryKey: "cafes",
    discoveryKind: "place",
    address: "Avenida de Teste, 200",
    postalCode: "04567000",
    cityName: "Campinas",
    stateName: "Rio de Janeiro",
    countryName: "Brasil",
  });

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
  assert.equal(commercialPersonalFieldAttempt.body.error.code, "ACCOUNT_FIELD_NOT_ALLOWED");

  const publicProfileAfterCommercialEdit = await request(
    `/api/v1/profiles/${commercial.account.username}`,
    { auth: personal },
  );
  assert.equal(publicProfileAfterCommercialEdit.response.status, 200);
  assert.equal(publicProfileAfterCommercialEdit.body.account.displayName, "Comércio Revisado A02");
  assert.equal("email" in publicProfileAfterCommercialEdit.body.account, false);
  assert.equal("age" in publicProfileAfterCommercialEdit.body.account, false);

  const accountSearch = await request(
    `/api/v1/social/accounts?q=${encodeURIComponent(commercial.account.username)}`,
    { auth: personal },
  );
  assert.equal(accountSearch.response.status, 200, JSON.stringify(accountSearch.body));
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
  const profileWhileRequestPending = await request(`/api/v1/profiles/${personal.account.username}`, {
    auth: commercial,
  });
  assert.equal(profileWhileRequestPending.response.status, 200);
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
  const profileAfterApproval = await request(`/api/v1/profiles/${personal.account.username}`, {
    auth: commercial,
  });
  assert.equal(profileAfterApproval.response.status, 200);
  assert.equal(profileAfterApproval.body.visibility.canViewPublicContent, true);
  assert.equal(profileAfterApproval.body.visibility.canViewCircleContent, false);

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
  const profileAfterMutualFollow = await request(`/api/v1/profiles/${personal.account.username}`, {
    auth: commercial,
  });
  assert.equal(profileAfterMutualFollow.body.visibility.canViewCircleContent, true);

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
    `/api/v1/social/accounts?q=${encodeURIComponent(personal.account.username)}`,
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
    `/api/v1/profiles/${personal.account.username}`,
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
  const relationshipsAfterAcceptRace = await db
    .select()
    .from(accountFollows)
    .where(eq(accountFollows.followerId, commercial.account.id));
  assert.ok(!relationshipsAfterAcceptRace.some((row) => row.followedId === personal.account.id));
  const requestsAfterBlock = await request("/api/v1/social/follow-requests", { auth: personal });
  assert.deepEqual(requestsAfterBlock.body.items, []);

  assert.equal(emailMessages.length, 2, "Verification messages must be captured by the in-memory test sink.");
  assert.equal(await publicSchemaFingerprint(), publicSchemaBefore, "API tests changed the public schema.");
});
