import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const localChromiumPath = "/repl/tools/bin/chromium";

export const authTestBaseUrl = resolveLocalBaseUrl();

function resolveLocalBaseUrl() {
  const configuredUrl =
    process.env.SEEKALIVE_WEB_URL ?? "http://127.0.0.1:5000";
  const url = new URL(configuredUrl);

  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname)
  ) {
    throw new Error(
      "Auth browser tests only allow a local development URL. Set SEEKALIVE_WEB_URL to localhost.",
    );
  }

  return url.origin;
}

export async function launchAuthTestBrowser() {
  const configuredChromiumPath = process.env.SEEKALIVE_CHROMIUM_EXECUTABLE_PATH;
  const executablePath =
    configuredChromiumPath ??
    (existsSync(localChromiumPath) ? localChromiumPath : undefined);

  return chromium.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox"],
  });
}

export async function verifyLocalAppIsRunning() {
  let response;
  try {
    response = await fetch(authTestBaseUrl, {
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new Error(
      "The local Seekalive preview is not reachable. Start the Start application workflow before running Auth browser tests.",
    );
  }

  assert.equal(
    response.ok,
    true,
    `The local preview returned HTTP ${response.status}.`,
  );
}

export function createAuthResult({ onboardingCompleted = true } = {}) {
  return {
    account: {
      id: "11111111-1111-4111-8111-111111111111",
      username: "auth_e2e",
      displayName: "Conta E2E",
      accountType: "personal",
      joinedAt: "2026-10-27T00:00:00.000Z",
      onboardingCompleted,
    },
    session: {
      id: "22222222-2222-4222-8222-222222222222",
      createdAt: "2026-10-27T00:00:00.000Z",
      expiresAt: "2026-10-28T00:00:00.000Z",
    },
    csrfToken: "csrf-e2e",
    emailVerified: true,
  };
}

export function createDeviceChallenge() {
  const now = Date.now();
  return {
    status: "device_verification_required",
    challengeId: "33333333-3333-4333-8333-333333333333",
    emailMasked: "a***@example.com",
    expiresAt: new Date(now + 10 * 60_000).toISOString(),
    resendAvailableAt: new Date(now + 30_000).toISOString(),
    message: "Confirme esta instalação para concluir o acesso.",
  };
}

export function createPasswordUpdateChallenge() {
  return {
    status: "password_update_verification_required",
    challengeId: "44444444-4444-4444-8444-444444444444",
    emailMasked: "a***@example.com",
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    message: "Confirme a alteração de senha.",
  };
}

export function jsonResponse(status, body) {
  return { status, body };
}

export async function createAuthTestPage(browser, handlers = {}) {
  const page = await browser.newPage({
    locale: "pt-BR",
    viewport: { width: 1280, height: 900 },
  });
  const requests = [];
  const unhandledApiRequests = [];
  const blockedExternalRequests = [];
  page.setDefaultTimeout(8_000);

  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === authTestBaseUrl) {
      await route.continue();
      return;
    }

    blockedExternalRequests.push(requestUrl.origin);
    await route.abort();
  });

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const requestBody = parseRequestBody(request.postData());
    const requestRecord = {
      method: request.method(),
      path: url.pathname,
      body: requestBody,
      headers: request.headers(),
    };
    requests.push(requestRecord);

    const key = `${requestRecord.method} ${requestRecord.path}`;
    const handler = handlers[key];
    let response;

    if (handler) {
      response = await handler({
        request: requestRecord,
        requests,
      });
    } else if (key === "GET /api/v1/auth/csrf") {
      response = jsonResponse(200, { csrfToken: "csrf-e2e" });
    } else if (key === "GET /api/v1/auth/session") {
      response = jsonResponse(200, {
        authenticated: false,
        account: null,
        session: null,
      });
    } else {
      unhandledApiRequests.push(key);
      response = jsonResponse(501, {
        error: {
          key: "INTERNAL_ERROR",
          message: "Auth browser test did not configure this API request.",
        },
      });
    }

    await route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: JSON.stringify(response.body),
    });
  });

  return { page, requests, unhandledApiRequests, blockedExternalRequests };
}

function parseRequestBody(rawBody) {
  if (!rawBody) return undefined;
  try {
    return JSON.parse(rawBody);
  } catch {
    return undefined;
  }
}
