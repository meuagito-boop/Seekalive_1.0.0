import assert from "node:assert/strict";
import { fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { authTestBaseUrl } from "./authTestBrowser.mjs";

const projectRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const apiServerPath = resolve(
  projectRoot,
  "Aplicativo/back/test/authRegistrationBrowserServer.mjs",
);
const loopbackHosts = new Set(["127.0.0.1", "::1", "localhost"]);
const allowedExternalOrigins = new Set(["https://fonts.googleapis.com"]);

function assertLoopbackHttpUrl(value, label) {
  const url = new URL(value);
  assert.equal(url.protocol, "http:", `${label} must use local HTTP.`);
  assert.ok(loopbackHosts.has(url.hostname), `${label} must use loopback.`);
  return url;
}

function waitForProcessExit(child, timeoutMs = 30_000) {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode);
  return new Promise((resolveExit, rejectExit) => {
    const timer = setTimeout(() => {
      rejectExit(new Error("The isolated API test process did not exit."));
    }, timeoutMs);
    child.once("exit", (code) => {
      clearTimeout(timer);
      resolveExit(code);
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      rejectExit(error);
    });
  });
}

export async function startIsolatedAuthRegistrationApi() {
  const environment = {
    ...process.env,
    NODE_ENV: "test",
    SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS: "1",
    SEEKALIVE_EXPECTED_DATABASE: "heliumdb",
    SEEKALIVE_DATABASE_TARGET: "replit",
    SEEKALIVE_DB_MIGRATION_TARGET: "replit",
    SESSION_SECRET: "seekalive-auth-browser-test-session-secret",
    RESEND_ENABLED: "false",
  };
  delete environment.REPLIT_DEPLOYMENT;
  delete environment.SEEKALIVE_DB_SCHEMA;
  delete environment.RESEND_API_KEY;
  delete environment.RESEND_FROM_EMAIL;

  const child = fork(apiServerPath, [], {
    cwd: resolve(projectRoot, "scripts"),
    execArgv: ["--import", "tsx"],
    env: environment,
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
  const messages = [];
  const waiters = [];
  let childFailure;

  function receive(message) {
    if (!message || typeof message !== "object") return;
    messages.push(message);
    for (let index = waiters.length - 1; index >= 0; index -= 1) {
      const waiter = waiters[index];
      if (!waiter.predicate(message)) continue;
      waiters.splice(index, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(message);
    }
  }

  function waitForMessage(predicate, description, timeoutMs = 15_000) {
    const queuedIndex = messages.findIndex(predicate);
    if (queuedIndex >= 0) {
      return Promise.resolve(messages.splice(queuedIndex, 1)[0]);
    }
    if (childFailure) return Promise.reject(childFailure);

    return new Promise((resolveMessage, rejectMessage) => {
      const waiter = {
        predicate,
        resolve: resolveMessage,
        reject: rejectMessage,
        timer: setTimeout(() => {
          const index = waiters.indexOf(waiter);
          if (index >= 0) waiters.splice(index, 1);
          rejectMessage(new Error(`Timed out waiting for ${description}.`));
        }, timeoutMs),
      };
      waiters.push(waiter);
    });
  }

  function sendMessage(message) {
    return new Promise((resolveSend, rejectSend) => {
      if (!child.connected || child.exitCode !== null) {
        rejectSend(new Error("The isolated API test process is not running."));
        return;
      }
      child.send(message, (error) => {
        if (error) rejectSend(error);
        else resolveSend();
      });
    });
  }

  child.on("message", receive);
  child.once("error", (error) => {
    childFailure = error;
    for (const waiter of waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
  });
  child.once("exit", (code) => {
    if (code === 0) return;
    childFailure = new Error(
      `The isolated API test process exited with status ${code ?? "unknown"}.`,
    );
    for (const waiter of waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(childFailure);
    }
  });

  let ready;
  try {
    const startup = await waitForMessage(
      (message) => message.type === "ready" || message.type === "startup-error",
      "the isolated API server",
      90_000,
    );
    if (startup.type === "startup-error") {
      throw new Error(
        `Isolated API startup failed at ${startup.stage} (${startup.errorName}${startup.errorCode ? `, ${startup.errorCode}` : ""}).`,
      );
    }
    ready = startup;
  } catch (error) {
    if (child.connected) child.kill("SIGTERM");
    await waitForProcessExit(child).catch(() => {});
    throw error;
  }

  const apiUrl = assertLoopbackHttpUrl(ready.apiBaseUrl, "The isolated API");

  return {
    apiBaseUrl: apiUrl.origin,
    waitForVerificationEmail(email) {
      return waitForMessage(
        (message) =>
          message.type === "verification-email" &&
          message.email === email.toLowerCase(),
        "the captured verification email",
      );
    },
    waitForDeviceLoginEmail(email) {
      return waitForMessage(
        (message) =>
          message.type === "device-login-email" &&
          message.email === email.toLowerCase(),
        "the captured new-device login email",
      );
    },
    async failVerificationDelivery(email) {
      const requestId = randomUUID();
      const armed = waitForMessage(
        (message) =>
          message.type === "delivery-failure-armed" &&
          message.requestId === requestId,
        "the controlled email failure",
      );
      await sendMessage({
        type: "fail-verification-email",
        requestId,
        email,
      });
      await armed;
    },
    async verifyRegistration(registration) {
      const requestId = randomUUID();
      const response = waitForMessage(
        (message) =>
          message.type === "registration-check" &&
          message.requestId === requestId,
        "the isolated account persistence check",
      );
      await sendMessage({
        type: "verify-registration",
        requestId,
        ...registration,
      });
      const result = await response;
      assert.equal(
        result.errorName,
        undefined,
        `Registration persistence query failed (${result.errorCode ?? "unknown"}).`,
      );
      return result;
    },
    async inspectAccountSecurity(username) {
      const requestId = randomUUID();
      const response = waitForMessage(
        (message) =>
          message.type === "security-check" && message.requestId === requestId,
        "the isolated account security check",
      );
      await sendMessage({
        type: "inspect-account-security",
        requestId,
        username,
      });
      const result = await response;
      assert.equal(
        result.errorName,
        undefined,
        `Account security query failed (${result.errorCode ?? "unknown"}).`,
      );
      return result;
    },
    async stop() {
      if (child.exitCode !== null) {
        assert.equal(child.exitCode, 0);
        return;
      }
      const stoppedResponse = waitForMessage(
        (message) =>
          message.type === "stopped" || message.type === "shutdown-error",
        "isolated schema cleanup",
        30_000,
      );
      await sendMessage({ type: "shutdown" });
      const stopped = await stoppedResponse;
      assert.equal(stopped.type, "stopped", "Isolated schema cleanup failed.");
      assert.equal(stopped.schemaRemoved, true);
      assert.equal(stopped.publicSchemaUnchanged, true);
      const exitCode = await waitForProcessExit(child);
      assert.equal(exitCode, 0);
    },
  };
}

export async function createAuthIntegrationPage(browser, apiBaseUrl) {
  const apiUrl = assertLoopbackHttpUrl(apiBaseUrl, "The isolated API");
  const appUrl = assertLoopbackHttpUrl(authTestBaseUrl, "The web app");
  const apiResponses = [];
  const apiTransportFailures = [];
  const blockedExternalRequests = [];
  const page = await browser.newPage({ locale: "pt-BR" });
  page.setDefaultTimeout(10_000);

  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === appUrl.origin) {
      await route.continue();
      return;
    }
    blockedExternalRequests.push(requestUrl.origin);
    await route.abort();
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    const headers = await request.allHeaders();
    const originalOrigin = headers.origin ?? appUrl.origin;
    if (originalOrigin === "null") {
      apiTransportFailures.push({
        method: request.method(),
        path: requestUrl.pathname,
        reason: "opaque-origin",
      });
      await route.abort();
      return;
    }

    const originUrl = new URL(originalOrigin);
    headers["x-forwarded-host"] = originUrl.host;
    headers["x-forwarded-proto"] = originUrl.protocol.slice(0, -1);
    delete headers.host;

    try {
      const targetUrl = new URL(
        `${requestUrl.pathname}${requestUrl.search}`,
        `${apiUrl.origin}/`,
      );
      const response = await route.fetch({
        url: targetUrl.toString(),
        headers,
        maxRedirects: 0,
      });
      const body = await response.body();
      const responseHeaders = response.headers();
      let payload;
      if (responseHeaders["content-type"]?.includes("application/json")) {
        try {
          payload = JSON.parse(body.toString("utf8"));
        } catch {
          payload = undefined;
        }
      }
      apiResponses.push({
        method: request.method(),
        path: requestUrl.pathname,
        status: response.status(),
        ...(payload === undefined ? {} : { payload }),
      });
      await route.fulfill({ response, body });
    } catch (error) {
      apiTransportFailures.push({
        method: request.method(),
        path: requestUrl.pathname,
        reason: error instanceof Error ? error.name : "unknown",
      });
      await route.abort();
    }
  });

  return {
    page,
    apiResponses,
    apiTransportFailures,
    blockedExternalRequests,
    allowedExternalOrigins,
  };
}
