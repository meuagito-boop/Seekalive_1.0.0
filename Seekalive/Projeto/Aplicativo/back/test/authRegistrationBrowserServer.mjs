import assert from "node:assert/strict";
import { once } from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  configureIsolatedDatabaseEnvironment,
  createIsolatedSchemaName,
  setupIsolatedDatabaseFixture,
} from "./support/isolatedDatabaseFixture.mjs";

const projectRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const schemaName = createIsolatedSchemaName();
const expectedDatabase = process.env.SEEKALIVE_EXPECTED_DATABASE?.trim();

if (typeof process.send !== "function") {
  throw new Error(
    "The isolated Auth browser server requires a parent test process.",
  );
}
configureIsolatedDatabaseEnvironment({
  schemaName,
  sessionSecret: "seekalive-auth-browser-test-session-secret",
});

let pool;
let db;
let tables;
let server;
let databaseFixture;
let shutdownPromise;
let setupStage = "database-import";
const intentionallyFailedEmailDeliveries = new Set();
const capturedVerificationEmails = new Set();

function send(message) {
  if (process.connected) process.send(message);
}

async function initializeIsolatedDatabase() {
  databaseFixture = await setupIsolatedDatabaseFixture({
    schemaName,
    expectedDatabase,
    projectRoot,
    pool,
  });
}

async function verifyRegistration(message) {
  if (
    typeof message.requestId !== "string" ||
    typeof message.email !== "string" ||
    typeof message.username !== "string" ||
    !["personal", "commercial"].includes(message.accountType)
  ) {
    send({
      type: "registration-check",
      requestId: message.requestId,
      valid: false,
    });
    return;
  }

  const [account] = await db
    .select({
      id: tables.accounts.id,
      username: tables.accounts.username,
      accountType: tables.accounts.accountType,
      status: tables.accounts.status,
      displayName: tables.accounts.displayName,
      firstName: tables.accounts.firstName,
      lastName: tables.accounts.lastName,
      acceptedTermsVersion: tables.accounts.acceptedTermsVersion,
    })
    .from(tables.accounts)
    .where(eq(tables.accounts.username, message.username))
    .limit(1);

  if (!account) {
    send({
      type: "registration-check",
      requestId: message.requestId,
      accountFound: false,
    });
    return;
  }

  const [email] = await db
    .select({ verifiedAt: tables.accountEmails.verifiedAt })
    .from(tables.accountEmails)
    .where(
      and(
        eq(tables.accountEmails.accountId, account.id),
        eq(tables.accountEmails.emailNormalized, message.email.toLowerCase()),
      ),
    )
    .limit(1);

  const [credential] = await db
    .select({ passwordHash: tables.passwordCredentials.passwordHash })
    .from(tables.passwordCredentials)
    .where(eq(tables.passwordCredentials.accountId, account.id))
    .limit(1);
  const [session] = await db
    .select({ id: tables.sessions.id })
    .from(tables.sessions)
    .where(eq(tables.sessions.accountId, account.id))
    .limit(1);

  const expectedIdentityMatches =
    message.accountType === "personal"
      ? account.firstName === message.firstName &&
        account.lastName === message.lastName
      : account.displayName === message.businessName;

  let commercialProfileMatches = message.accountType === "personal";
  if (message.accountType === "commercial") {
    const [profile] = await db
      .select({
        categoryKey: tables.commercialProfiles.categoryKey,
        discoveryKind: tables.commercialProfiles.discoveryKind,
        address: tables.commercialProfiles.address,
        postalCode: tables.commercialProfiles.postalCode,
        cityName: tables.commercialProfiles.cityName,
        stateName: tables.commercialProfiles.stateName,
        countryName: tables.commercialProfiles.countryName,
      })
      .from(tables.commercialProfiles)
      .where(eq(tables.commercialProfiles.accountId, account.id))
      .limit(1);
    commercialProfileMatches = Boolean(
      profile &&
      profile.categoryKey === message.categoryKey &&
      profile.discoveryKind === message.discoveryKind &&
      profile.address === message.address &&
      profile.postalCode === message.postalCode &&
      profile.cityName === message.city &&
      profile.stateName === message.state &&
      profile.countryName === message.country,
    );
  } else {
    const [commercialProfile] = await db
      .select({ accountId: tables.commercialProfiles.accountId })
      .from(tables.commercialProfiles)
      .where(eq(tables.commercialProfiles.accountId, account.id))
      .limit(1);
    commercialProfileMatches = !commercialProfile;
  }

  send({
    type: "registration-check",
    requestId: message.requestId,
    accountFound: true,
    accountTypeMatches: account.accountType === message.accountType,
    accountStatus: account.status,
    identityMatches: expectedIdentityMatches,
    emailVerified: Boolean(email?.verifiedAt),
    termsRecorded: account.acceptedTermsVersion === "v1",
    passwordIsArgon2id:
      typeof credential?.passwordHash === "string" &&
      credential.passwordHash.startsWith("$argon2id$"),
    sessionExists: Boolean(session),
    verificationEmailCaptured: capturedVerificationEmails.has(
      message.email.toLowerCase(),
    ),
    commercialProfileMatches,
  });
}

async function inspectAccountSecurity(message) {
  if (
    typeof message.requestId !== "string" ||
    typeof message.username !== "string"
  ) {
    send({
      type: "security-check",
      requestId: message.requestId,
      errorName: "InvalidTestRequest",
    });
    return;
  }

  const [account] = await db
    .select({
      id: tables.accounts.id,
      status: tables.accounts.status,
    })
    .from(tables.accounts)
    .where(eq(tables.accounts.username, message.username))
    .limit(1);
  if (!account) {
    send({
      type: "security-check",
      requestId: message.requestId,
      accountFound: false,
    });
    return;
  }

  const [activeSessions, activeDevices] = await Promise.all([
    db
      .select({ id: tables.sessions.id })
      .from(tables.sessions)
      .where(
        and(
          eq(tables.sessions.accountId, account.id),
          isNull(tables.sessions.revokedAt),
        ),
      ),
    db
      .select({ id: tables.trustedDevices.id })
      .from(tables.trustedDevices)
      .where(
        and(
          eq(tables.trustedDevices.accountId, account.id),
          isNull(tables.trustedDevices.revokedAt),
        ),
      ),
  ]);

  send({
    type: "security-check",
    requestId: message.requestId,
    accountFound: true,
    accountStatus: account.status,
    activeSessionCount: activeSessions.length,
    activeDeviceCount: activeDevices.length,
  });
}

async function cleanupDatabase() {
  if (server?.listening) {
    await new Promise((resolveClose, rejectClose) => {
      server.close((error) => (error ? rejectClose(error) : resolveClose()));
      server.closeAllConnections();
    });
  }
  if (databaseFixture) return databaseFixture.cleanup();
  if (pool) await pool.end();
  return { schemaRemoved: true, publicSchemaUnchanged: false };
}

async function shutdown() {
  if (shutdownPromise) return shutdownPromise;
  shutdownPromise = (async () => {
    const cleanup = await cleanupDatabase();
    send({
      type: "stopped",
      ...cleanup,
    });
    if (process.connected) process.disconnect();
  })();
  return shutdownPromise;
}

const { and, eq, isNull } = await import("drizzle-orm");
const database = await import("@workspace/db");
pool = database.pool;
db = database.db;
tables = {
  accounts: database.accounts,
  accountEmails: database.accountEmails,
  commercialProfiles: database.commercialProfiles,
  passwordCredentials: database.passwordCredentials,
  sessions: database.sessions,
  trustedDevices: database.trustedDevices,
};

try {
  setupStage = "isolated-database-initialization";
  await initializeIsolatedDatabase();

  setupStage = "email-test-adapter";
  const { setAuthEmailDeliveryForTests } =
    await import("../src/modules/auth/infrastructure/emailDelivery.ts");
  setAuthEmailDeliveryForTests({
    isConfigured: true,
    async sendVerificationCode(message) {
      if (intentionallyFailedEmailDeliveries.has(message.email.toLowerCase())) {
        throw new Error("Controlled email delivery failure for this test.");
      }
      capturedVerificationEmails.add(message.email.toLowerCase());
      send({
        type: "verification-email",
        email: message.email,
        code: message.code,
      });
    },
    async sendPasswordResetCode() {},
    async sendDeviceLoginCode(message) {
      send({
        type: "device-login-email",
        email: message.email.toLowerCase(),
        code: message.code,
      });
    },
    async sendPasswordUpdateCode() {},
    async sendAccountPasswordChangeCode() {},
    async sendAccountEmailChangeCurrentCode() {},
    async sendAccountEmailChangeNewCode() {},
    async sendAccountEmailChangeSecurityNotice() {},
  });

  setupStage = "api-server-start";
  const { default: app } = await import("../src/app.ts");
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");

  process.on("message", (message) => {
    if (message?.type === "shutdown") {
      void shutdown().catch(() => {
        send({ type: "shutdown-error" });
        process.exitCode = 1;
      });
      return;
    }
    if (message?.type === "verify-registration") {
      void verifyRegistration(message).catch((error) => {
        send({
          type: "registration-check",
          requestId: message.requestId,
          errorName: error instanceof Error ? error.name : "UnknownError",
          ...(error &&
          typeof error === "object" &&
          "code" in error &&
          typeof error.code === "string"
            ? { errorCode: error.code }
            : {}),
        });
      });
      return;
    }
    if (message?.type === "inspect-account-security") {
      void inspectAccountSecurity(message).catch((error) => {
        send({
          type: "security-check",
          requestId: message.requestId,
          errorName: error instanceof Error ? error.name : "UnknownError",
          ...(error &&
          typeof error === "object" &&
          "code" in error &&
          typeof error.code === "string"
            ? { errorCode: error.code }
            : {}),
        });
      });
      return;
    }
    if (
      message?.type === "fail-verification-email" &&
      typeof message.email === "string" &&
      typeof message.requestId === "string"
    ) {
      intentionallyFailedEmailDeliveries.add(message.email.toLowerCase());
      send({
        type: "delivery-failure-armed",
        requestId: message.requestId,
      });
    }
  });
  process.once("disconnect", () => {
    void shutdown().catch(() => {
      process.exitCode = 1;
    });
  });
  process.once("SIGTERM", () => {
    void shutdown().catch(() => {
      process.exitCode = 1;
    });
  });

  send({ type: "ready", apiBaseUrl: `http://127.0.0.1:${address.port}` });
} catch (error) {
  const errorCode =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : undefined;
  send({
    type: "startup-error",
    stage: setupStage,
    errorName: error instanceof Error ? error.name : "UnknownError",
    ...(errorCode ? { errorCode } : {}),
  });
  try {
    await cleanupDatabase();
  } catch {
    process.exitCode = 1;
  }
  if (process.connected) process.disconnect();
  process.exitCode = 1;
}
