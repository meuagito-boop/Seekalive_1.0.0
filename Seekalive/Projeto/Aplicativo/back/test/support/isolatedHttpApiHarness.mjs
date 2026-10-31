import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  configureIsolatedDatabaseEnvironment,
  createIsolatedSchemaName,
  setupIsolatedDatabaseFixture,
} from "./isolatedDatabaseFixture.mjs";

const testEmailTypes = [
  "verification",
  "passwordReset",
  "deviceLogin",
  "passwordUpdate",
  "accountPasswordChange",
  "accountEmailChangeCurrent",
  "accountEmailChangeNew",
  "accountEmailChangeSecurityNotice",
  "accountDeletion",
];

function createEmailSink() {
  return Object.fromEntries(testEmailTypes.map((type) => [type, []]));
}

function responseCookies(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const cookie = response.headers.get("set-cookie");
  return cookie ? [cookie] : [];
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

export async function startIsolatedHttpApiHarness({
  sessionSecret,
  requiredTables = [],
}) {
  assert.equal(typeof sessionSecret, "string");
  assert.ok(sessionSecret.length >= 32);

  const schemaName = createIsolatedSchemaName();
  const testDirectory = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(testDirectory, "../../../..");
  const expectedDatabase = process.env.SEEKALIVE_EXPECTED_DATABASE?.trim();
  configureIsolatedDatabaseEnvironment({ schemaName, sessionSecret });

  const database = await import("@workspace/db");
  const { getTableConfig } = await import("drizzle-orm/pg-core");
  const { PRE_AUTH_COOKIE } =
    await import("../../src/security/sessionConfig.ts");
  for (const exportName of requiredTables) {
    const table = database[exportName];
    assert.ok(table, `Database table export "${exportName}" must exist.`);
    assert.equal(
      getTableConfig(table).schema,
      schemaName,
      `Database table "${exportName}" must target the isolated schema.`,
    );
  }

  let pool = database.pool;
  let isolatedDatabaseFixture;
  let server;
  const emails = createEmailSink();
  const cleanupCallbacks = [];

  try {
    isolatedDatabaseFixture = await setupIsolatedDatabaseFixture({
      schemaName,
      expectedDatabase,
      projectRoot,
      pool,
    });

    const { setAuthEmailDeliveryForTests } =
      await import("../../src/modules/auth/infrastructure/emailDelivery.ts");
    setAuthEmailDeliveryForTests({
      isConfigured: true,
      async sendVerificationCode(message) {
        emails.verification.push(message);
      },
      async sendPasswordResetCode(message) {
        emails.passwordReset.push(message);
      },
      async sendDeviceLoginCode(message) {
        emails.deviceLogin.push(message);
      },
      async sendPasswordUpdateCode(message) {
        emails.passwordUpdate.push(message);
      },
      async sendAccountPasswordChangeCode(message) {
        emails.accountPasswordChange.push(message);
      },
      async sendAccountEmailChangeCurrentCode(message) {
        emails.accountEmailChangeCurrent.push(message);
      },
      async sendAccountEmailChangeNewCode(message) {
        emails.accountEmailChangeNew.push(message);
      },
      async sendAccountEmailChangeSecurityNotice(message) {
        emails.accountEmailChangeSecurityNotice.push(message);
      },
      async sendAccountDeletionCode(message) {
        emails.accountDeletion.push(message);
      },
    });

    const { default: app } = await import("../../src/app.ts");
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    async function request(
      path,
      {
        method = "GET",
        body,
        auth,
        clientIp = "203.0.113.42",
        headers: suppliedHeaders,
      } = {},
    ) {
      const headers = new Headers(suppliedHeaders);
      if (clientIp !== null && !headers.has("x-seekalive-client-ip")) {
        headers.set("x-seekalive-client-ip", clientIp);
      }
      if (auth?.cookie) headers.set("cookie", auth.cookie);
      if (auth?.csrfToken) headers.set("x-csrf-token", auth.csrfToken);

      let requestBody;
      if (body !== undefined) {
        if (
          typeof body === "string" ||
          body instanceof ArrayBuffer ||
          ArrayBuffer.isView(body) ||
          body instanceof Blob
        ) {
          requestBody = body;
        } else {
          if (!headers.has("content-type")) {
            headers.set("content-type", "application/json");
          }
          requestBody = JSON.stringify(body);
        }
      }

      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        ...(requestBody === undefined ? {} : { body: requestBody }),
      });
      const contentType = response.headers.get("content-type") ?? "";
      let responseBody = null;
      if (response.status !== 204) {
        if (contentType.includes("application/json")) {
          responseBody = await response.json();
        } else {
          responseBody = Buffer.from(await response.arrayBuffer());
        }
      }
      mergeResponseCookies(auth, response);
      if (auth && responseBody?.csrfToken) {
        auth.csrfToken = responseBody.csrfToken;
      }
      return { response, body: responseBody };
    }

    async function createPreAuth() {
      const { response, body } = await request("/api/v1/auth/csrf");
      assert.equal(response.status, 200, JSON.stringify(body));
      assert.equal(typeof body?.csrfToken, "string");
      return {
        cookie: cookieValue(response, PRE_AUTH_COOKIE),
        csrfToken: body.csrfToken,
      };
    }

    async function registerAccount(registration, auth = undefined) {
      const preAuth = auth ?? (await createPreAuth());
      const { response, body } = await request("/api/v1/auth/register", {
        method: "POST",
        body: registration,
        auth: preAuth,
      });
      assert.equal(response.status, 202, JSON.stringify(body));
      assert.equal(body?.status, "verification_required");
      const email = registration.email.toLowerCase();
      const message = emails.verification.findLast(
        (item) => item.email === email,
      );
      assert.ok(message, "The in-memory sink must capture the verification code.");
      return { email, password: registration.password, message, preAuth, body };
    }

    async function confirmAccount(pending) {
      const { response, body } = await request(
        "/api/v1/auth/verification/confirm",
        {
          method: "POST",
          body: { email: pending.email, code: pending.message.code },
          auth: pending.preAuth,
        },
      );
      assert.equal(response.status, 200, JSON.stringify(body));
      assert.equal(body?.emailVerified, true);
      return {
        account: body.account,
        auth: pending.preAuth,
        cookie: pending.preAuth.cookie,
        csrfToken: pending.preAuth.csrfToken,
        email: pending.email,
        password: pending.password,
      };
    }

    async function createVerifiedAccount(accountType, suffix = undefined) {
      assert.ok(accountType === "personal" || accountType === "commercial");
      const uniqueSuffix =
        suffix ?? randomUUID().replaceAll("-", "").slice(0, 10);
      const safeSuffix = uniqueSuffix.toLowerCase().replace(/[^a-z0-9_]/g, "");
      assert.ok(safeSuffix.length >= 2 && safeSuffix.length <= 14);
      const username =
        accountType === "commercial"
          ? `b_${safeSuffix}`
          : `p_${safeSuffix}`;
      const email = `${accountType}-${safeSuffix}@example.test`;
      const password = "A02_Isolated_Test_2026!";
      const registration =
        accountType === "commercial"
          ? {
              accountType,
              businessName: "Comércio de Teste",
              categoryKey: "cafes",
              discoveryKind: "place",
              address: "Rua Isolada, 10",
              postalCode: "01001000",
              city: "São Paulo",
              state: "SP",
              country: "Brasil",
              username,
              email,
              dateOfBirth: "01/01/1990",
              password,
              passwordConfirmation: password,
              acceptedTermsVersion: "v1",
            }
          : {
              accountType,
              firstName: "Pessoa",
              lastName: "Isolada",
              username,
              email,
              dateOfBirth: "01/01/1990",
              password,
              passwordConfirmation: password,
              acceptedTermsVersion: "v1",
            };

      const pending = await registerAccount(registration);
      const verified = await confirmAccount(pending);
      return { ...verified, username, registration };
    }

    async function close() {
      const closeErrors = [];
      if (server?.listening) {
        try {
          await new Promise((resolveClose, rejectClose) => {
            server.close((error) =>
              error ? rejectClose(error) : resolveClose(),
            );
            server.closeAllConnections();
          });
        } catch (error) {
          closeErrors.push(error);
        }
      }

      for (const cleanup of cleanupCallbacks.reverse()) {
        try {
          await cleanup({ database, pool, schemaName });
        } catch (error) {
          closeErrors.push(error);
        }
      }

      if (isolatedDatabaseFixture) {
        try {
          const result = await isolatedDatabaseFixture.cleanup();
          assert.equal(result.schemaRemoved, true);
          assert.equal(result.publicSchemaUnchanged, true);
        } catch (error) {
          closeErrors.push(error);
        }
      } else if (pool) {
        try {
          await pool.end();
        } catch (error) {
          closeErrors.push(error);
        }
      }

      if (closeErrors.length === 1) throw closeErrors[0];
      if (closeErrors.length > 1) {
        throw new AggregateError(
          closeErrors,
          "Isolated HTTP API cleanup failed in multiple steps.",
        );
      }
    }

    return {
      baseUrl,
      clientIp: "203.0.113.42",
      createPreAuth,
      createVerifiedAccount,
      database,
      emails,
      registerAccount,
      request,
      schemaName,
      addCleanup(callback) {
        assert.equal(typeof callback, "function");
        cleanupCallbacks.push(callback);
      },
      close,
    };
  } catch (error) {
    const startupErrors = [error];
    if (server?.listening) {
      try {
        server.closeAllConnections();
        await new Promise((resolveClose, rejectClose) => {
          server.close((closeError) =>
            closeError ? rejectClose(closeError) : resolveClose(),
          );
        });
      } catch (closeError) {
        startupErrors.push(closeError);
      }
    }
    if (isolatedDatabaseFixture) {
      try {
        await isolatedDatabaseFixture.cleanup();
      } catch (cleanupError) {
        startupErrors.push(cleanupError);
      }
    } else if (pool) {
      try {
        await pool.end();
      } catch (cleanupError) {
        startupErrors.push(cleanupError);
      }
    }
    if (startupErrors.length > 1) {
      throw new AggregateError(
        startupErrors,
        "Isolated HTTP API startup and cleanup both failed.",
        { cause: error },
      );
    }
    throw error;
  }
}

export function assertApiError(result, status, key) {
  assert.equal(result.response.status, status, JSON.stringify(result.body));
  assert.equal(result.body?.error?.key, key);
}
