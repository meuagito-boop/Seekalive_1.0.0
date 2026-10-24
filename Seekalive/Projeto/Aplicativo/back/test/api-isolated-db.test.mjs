import assert from "node:assert/strict";
import { once } from "node:events";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { after, before, test } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";

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
  const personalRegistration = {
    accountType: "personal",
    firstName: "Conta",
    lastName: "Isolada",
    username: `p_${suffix}`,
    email: `personal-${suffix}@example.com`,
    age: 31,
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
  const currentSession = await request("/api/v1/auth/session", { auth: personal });
  assert.equal(currentSession.response.status, 200);
  assert.equal(currentSession.body.authenticated, true);

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
  const commercial = await confirmAccount(pendingCommercial, commercialPreAuth);
  assert.equal(commercial.account.accountType, "commercial");
  const [businessProfile] = await db
    .select({ cityName: commercialProfiles.cityName, categoryKey: commercialProfiles.categoryKey })
    .from(commercialProfiles)
    .where(eq(commercialProfiles.accountId, commercial.account.id));
  assert.deepEqual(businessProfile, { cityName: "São Paulo", categoryKey: "cafes" });

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
  const requests = await request("/api/v1/social/follow-requests", { auth: personal });
  assert.ok(requests.body.items.some((item) => item.account.id === commercial.account.id));

  const accepted = await request(`/api/v1/social/follow-requests/${commercial.account.id}/accept`, {
    method: "POST",
    auth: personal,
  });
  assert.equal(accepted.response.status, 200);
  assert.equal(accepted.body.status, "accepted");

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

  const blocked = await request(`/api/v1/social/blocks/${commercial.account.id}`, {
    method: "PUT",
    auth: personal,
  });
  assert.equal(blocked.response.status, 204);
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
  const reblocked = await request(`/api/v1/social/blocks/${commercial.account.id}`, {
    method: "PUT",
    auth: personal,
  });
  assert.equal(reblocked.response.status, 204);
  const requestsAfterBlock = await request("/api/v1/social/follow-requests", { auth: personal });
  assert.deepEqual(requestsAfterBlock.body.items, []);

  assert.equal(emailMessages.length, 2, "Verification messages must be captured by the in-memory test sink.");
  assert.equal(await publicSchemaFingerprint(), publicSchemaBefore, "API tests changed the public schema.");
});
