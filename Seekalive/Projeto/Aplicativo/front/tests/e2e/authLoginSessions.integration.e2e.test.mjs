import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import {
  authTestBaseUrl,
  launchAuthTestBrowser,
  verifyLocalAppIsRunning,
} from "./authTestBrowser.mjs";
import {
  createAuthIntegrationPage,
  startIsolatedAuthRegistrationApi,
} from "./authRegistrationIntegrationSupport.mjs";

const testPassword = "TesteSeguro!2026";
let browser;
let isolatedApi;

before(async () => {
  await verifyLocalAppIsRunning();
  browser = await launchAuthTestBrowser();
  isolatedApi = await startIsolatedAuthRegistrationApi();
});

after(async () => {
  try {
    await isolatedApi?.stop();
  } finally {
    await browser?.close();
  }
});

function loginResponseFor(page) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/v1/auth/login" &&
      response.request().method() === "POST"
    );
  });
}

function assertNoUnexpectedResponses(network, allowedFailureStatuses = []) {
  const unexpected = network.apiResponses
    .filter(
      (response) =>
        response.status === 404 ||
        response.status === 501 ||
        response.status === 429 ||
        (response.status >= 500 &&
          !allowedFailureStatuses.includes(response.status)),
    )
    .map(({ method, path, status }) => `${method} ${path} → ${status}`);
  assert.deepEqual(
    unexpected,
    [],
    "The login and session journey must not depend on missing or failed API endpoints.",
  );

  const unapprovedOrigins = network.blockedExternalRequests.filter(
    (origin) => !network.allowedExternalOrigins.has(origin),
  );
  assert.deepEqual(
    network.apiTransportFailures,
    [],
    "The browser must reach only the local isolated API.",
  );
  assert.deepEqual(
    unapprovedOrigins,
    [],
    "The browser attempted an unapproved external request.",
  );
}

async function fillLogin(page, email) {
  await page.getByTestId("input-identifier").fill(email);
  await page.getByTestId("input-password").fill(testPassword);
  await page.getByTestId("button-login").click();
}

async function registerPersonalAccount({ network, email, username }) {
  const page = network.page;
  await page.goto(new URL("/register", authTestBaseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  await page.getByTestId("input-first-name").fill("Ana");
  await page.getByTestId("input-last-name").fill("Teste");
  await page.getByTestId("input-age").fill("29");
  await page.getByTestId("input-username").fill(username);
  await page.getByTestId("input-email").fill(email);
  await page.getByTestId("input-password").fill(testPassword);
  await page.getByTestId("input-confirm-password").fill(testPassword);
  await page
    .getByRole("checkbox", {
      name: "Aceito os Termos de Serviço e Política de Privacidade",
    })
    .click();

  const verificationEmail = isolatedApi.waitForVerificationEmail(email);
  await page.getByTestId("button-register").click();
  await page.waitForURL((url) => url.pathname === "/verify-email");
  const capturedEmail = await verificationEmail;
  assert.equal(
    /^\d{6}$/.test(capturedEmail.code),
    true,
    "The verification sink must capture a six-digit code.",
  );

  for (let index = 0; index < capturedEmail.code.length; index += 1) {
    await page
      .getByLabel(`Dígito ${index + 1} do código de confirmação por e-mail`, {
        exact: true,
      })
      .fill(capturedEmail.code[index]);
  }
  await page.getByTestId("button-verify").click();
  await page.waitForURL((url) => url.pathname === "/onboarding/interests");
  await page.getByTestId("button-skip-interests").click();
  await page.waitForURL((url) => url.pathname === "/feed");

  const registration = network.apiResponses.findLast(
    (response) =>
      response.method === "POST" && response.path === "/api/v1/auth/register",
  );
  const verification = network.apiResponses.findLast(
    (response) =>
      response.method === "POST" &&
      response.path === "/api/v1/auth/verification/confirm",
  );
  const onboarding = network.apiResponses.findLast(
    (response) =>
      response.method === "POST" &&
      response.path === "/api/v1/onboarding/interests",
  );
  assert.equal(registration?.status, 202);
  assert.equal(verification?.status, 200);
  assert.equal(onboarding?.status, 200);

  const state = await isolatedApi.verifyRegistration({
    accountType: "personal",
    email,
    username,
    firstName: "Ana",
    lastName: "Teste",
  });
  assert.equal(state.accountFound, true);
  assert.equal(state.accountStatus, "active");
  assert.equal(state.emailVerified, true);
  assert.equal(state.sessionExists, true);
  assert.equal(state.passwordIsArgon2id, true);

  assertNoUnexpectedResponses(network);
  return page;
}

async function inspectSecurityState(username, expected) {
  const state = await isolatedApi.inspectAccountSecurity(username);
  assert.equal(state.accountFound, true);
  assert.equal(state.accountStatus, "active");
  assert.equal(state.activeSessionCount, expected.sessions);
  assert.equal(state.activeDeviceCount, expected.devices);
  return state;
}

test("known and new device login, session revocation, and trusted-device revocation use real UI and isolated persistence", async (t) => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
  const email = `sessions.${suffix}@example.com`;
  const username = `sessions_${suffix}`;
  const registeredNetwork = await createAuthIntegrationPage(
    browser,
    isolatedApi.apiBaseUrl,
  );
  const knownDeviceNetwork = registeredNetwork;
  let newDeviceNetwork;
  t.after(async () => {
    await Promise.all([
      registeredNetwork.page.close(),
      newDeviceNetwork?.page.close(),
    ]);
  });

  const knownDevicePage = await registerPersonalAccount({
    network: registeredNetwork,
    email,
    username,
  });
  const deviceCookieBeforeLogout = (
    await knownDevicePage.context().cookies(authTestBaseUrl)
  ).find((cookie) => cookie.name === "__Host-seekalive_device");
  assert.ok(
    deviceCookieBeforeLogout,
    "Registration must establish a trusted installation.",
  );

  await knownDevicePage.goto(new URL("/settings", authTestBaseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  const logoutResponsePromise = knownDevicePage
    .waitForResponse(
      (response) => {
        const url = new URL(response.url());
        return (
          url.pathname === "/api/v1/auth/logout" &&
          response.request().method() === "POST"
        );
      },
      { timeout: 4000 },
    )
    .catch(() => null);
  await knownDevicePage.getByTestId("button-logout").click();
  const logoutResponse = await logoutResponsePromise;
  assert.ok(
    logoutResponse,
    `Logout did not reach the API. Observed: ${JSON.stringify(
      knownDeviceNetwork.apiResponses.map(({ method, path, status }) => ({
        method,
        path,
        status,
      })),
    )}`,
  );
  assert.equal(logoutResponse.status(), 204);
  await knownDevicePage.waitForURL((url) => url.pathname !== "/settings");

  const deviceCookieAfterLogout = (
    await knownDevicePage.context().cookies(authTestBaseUrl)
  ).find((cookie) => cookie.name === "__Host-seekalive_device");
  assert.equal(
    deviceCookieAfterLogout?.value === deviceCookieBeforeLogout.value,
    true,
    "Logout must revoke the session but retain the trusted-installation token.",
  );

  await knownDevicePage.goto(new URL("/login", authTestBaseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  const knownLoginResponsePromise = loginResponseFor(knownDevicePage);
  await fillLogin(knownDevicePage, email);
  const knownLoginResponse = await knownLoginResponsePromise;
  assert.equal(knownLoginResponse.status(), 200);
  await knownDevicePage.waitForURL(
    (url) =>
      url.pathname === "/onboarding/interests" || url.pathname === "/feed",
  );
  assert.equal(
    await knownDevicePage
      .getByRole("heading", { name: "Confirme esta instalação" })
      .count(),
    0,
    "A known installation must not receive a device challenge.",
  );
  await inspectSecurityState(username, { sessions: 1, devices: 1 });

  newDeviceNetwork = await createAuthIntegrationPage(
    browser,
    isolatedApi.apiBaseUrl,
  );
  const newDevicePage = newDeviceNetwork.page;
  await newDevicePage.goto(new URL("/login", authTestBaseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  const deviceEmailPromise = isolatedApi.waitForDeviceLoginEmail(email);
  const newDeviceLoginPromise = loginResponseFor(newDevicePage);
  await fillLogin(newDevicePage, email);
  const newDeviceLogin = await newDeviceLoginPromise;
  assert.equal(newDeviceLogin.status(), 202);
  const deviceEmail = await deviceEmailPromise;
  assert.equal(
    /^\d{6}$/.test(deviceEmail.code),
    true,
    "The new-device email sink must capture a six-digit code.",
  );
  await newDevicePage
    .getByRole("heading", { name: "Confirme esta instalação" })
    .waitFor();

  const pendingSecurityState = await inspectSecurityState(username, {
    sessions: 1,
    devices: 1,
  });
  assert.equal(
    pendingSecurityState.activeSessionCount,
    1,
    "A new device must not create a session before code confirmation.",
  );

  const invalidCode = deviceEmail.code === "000000" ? "000001" : "000000";
  const invalidCodeResponsePromise = newDevicePage.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        url.pathname === "/api/v1/auth/device-verification/confirm" &&
        response.request().method() === "POST"
      );
    },
  );
  await newDevicePage.getByLabel("Código de confirmação").fill(invalidCode);
  await newDevicePage.getByRole("button", { name: "Confirmar código" }).click();
  const invalidCodeResponse = await invalidCodeResponsePromise;
  assert.equal(invalidCodeResponse.status(), 400);
  const invalidCodePayload = await invalidCodeResponse.json();
  assert.equal(invalidCodePayload.error?.key, "INVALID_DEVICE_CODE");
  await newDevicePage
    .getByRole("heading", { name: "Confirme esta instalação" })
    .waitFor();
  await inspectSecurityState(username, { sessions: 1, devices: 1 });

  const validCodeResponsePromise = newDevicePage.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/v1/auth/device-verification/confirm" &&
      response.request().method() === "POST"
    );
  });
  await newDevicePage
    .getByLabel("Código de confirmação")
    .fill(deviceEmail.code);
  await newDevicePage.getByRole("button", { name: "Confirmar código" }).click();
  const validCodeResponse = await validCodeResponsePromise;
  assert.equal(validCodeResponse.status(), 200);
  await newDevicePage.waitForURL(
    (url) =>
      url.pathname === "/onboarding/interests" || url.pathname === "/feed",
  );
  await inspectSecurityState(username, { sessions: 2, devices: 2 });

  await newDevicePage.goto(
    new URL("/settings/security", authTestBaseUrl).toString(),
    { waitUntil: "domcontentloaded" },
  );
  const sessionList = newDevicePage.getByRole("list", {
    name: "Sessões ativas da conta",
  });
  const deviceList = newDevicePage.getByRole("list", {
    name: "Instalações confiáveis da conta",
  });
  await sessionList.waitFor();
  await deviceList.waitFor();
  assert.equal(await sessionList.getByRole("listitem").count(), 2);
  assert.equal(await deviceList.getByRole("listitem").count(), 2);
  assert.equal(await newDevicePage.getByText("Sessão atual").count(), 1);
  assert.equal(await newDevicePage.getByText("Instalação atual").count(), 1);

  const revokeSessionsResponsePromise = newDevicePage.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        url.pathname === "/api/v1/auth/sessions/others" &&
        response.request().method() === "DELETE"
      );
    },
  );
  newDevicePage.once("dialog", (dialog) => {
    void dialog.accept();
  });
  await newDevicePage
    .getByRole("button", { name: "Encerrar todas as outras sessões" })
    .click();
  const revokeSessionsResponse = await revokeSessionsResponsePromise;
  assert.equal(revokeSessionsResponse.status(), 200);
  assert.equal((await revokeSessionsResponse.json()).revokedCount, 1);
  await sessionList.getByRole("listitem").nth(1).waitFor({ state: "detached" });
  await inspectSecurityState(username, { sessions: 1, devices: 2 });

  const revokedKnownSession = await knownDevicePage.evaluate(async () => {
    const response = await fetch("/api/v1/auth/session", {
      credentials: "include",
    });
    return response.json();
  });
  assert.equal(revokedKnownSession.authenticated, false);

  const revokeDevicesResponsePromise = newDevicePage.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        url.pathname === "/api/v1/auth/devices/others" &&
        response.request().method() === "DELETE"
      );
    },
  );
  newDevicePage.once("dialog", (dialog) => {
    void dialog.accept();
  });
  await newDevicePage
    .getByRole("button", { name: "Revogar todas as outras instalações" })
    .click();
  const revokeDevicesResponse = await revokeDevicesResponsePromise;
  assert.equal(revokeDevicesResponse.status(), 200);
  assert.equal((await revokeDevicesResponse.json()).revokedCount, 1);
  await deviceList.getByRole("listitem").nth(1).waitFor({ state: "detached" });
  await inspectSecurityState(username, { sessions: 1, devices: 1 });

  await knownDevicePage.reload({ waitUntil: "domcontentloaded" });
  await knownDevicePage.goto(new URL("/login", authTestBaseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  await knownDevicePage.getByTestId("input-identifier").waitFor();
  const revokedDeviceEmailPromise = isolatedApi.waitForDeviceLoginEmail(email);
  const revokedDeviceLoginPromise = loginResponseFor(knownDevicePage);
  await fillLogin(knownDevicePage, email);
  const revokedDeviceLogin = await revokedDeviceLoginPromise;
  assert.equal(revokedDeviceLogin.status(), 202);
  const revokedDeviceEmail = await revokedDeviceEmailPromise;
  assert.equal(
    /^\d{6}$/.test(revokedDeviceEmail.code),
    true,
    "The revoked installation must receive a new six-digit code.",
  );
  await knownDevicePage
    .getByRole("heading", { name: "Confirme esta instalação" })
    .waitFor();
  await inspectSecurityState(username, { sessions: 1, devices: 1 });

  assertNoUnexpectedResponses(knownDeviceNetwork);
  assertNoUnexpectedResponses(newDeviceNetwork);
  t.diagnostic(
    "Known installation login bypassed OTP; a new installation required a captured code; settings listed and revoked sessions/devices; the revoked token required email confirmation again.",
  );
});
