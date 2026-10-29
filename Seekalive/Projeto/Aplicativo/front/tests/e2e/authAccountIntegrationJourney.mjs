import assert from "node:assert/strict";
import { authTestBaseUrl } from "./authTestBrowser.mjs";

export function loginResponseFor(page) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/v1/auth/login" &&
      response.request().method() === "POST"
    );
  });
}

export async function fillLogin(page, email, password) {
  await page.getByTestId("input-identifier").fill(email);
  await page.getByTestId("input-password").fill(password);
  await page.getByTestId("button-login").click();
}

export async function registerPersonalAccount({
  network,
  isolatedApi,
  email,
  username,
  password,
}) {
  const page = network.page;
  await page.goto(new URL("/register", authTestBaseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  await page.getByTestId("input-first-name").fill("Ana");
  await page.getByTestId("input-last-name").fill("Teste");
  await page.getByTestId("input-age").fill("29");
  await page.getByTestId("input-username").fill(username);
  await page.getByTestId("input-email").fill(email);
  await page.getByTestId("input-password").fill(password);
  await page.getByTestId("input-confirm-password").fill(password);
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

export async function inspectSecurityState(isolatedApi, username, expected) {
  const state = await isolatedApi.inspectAccountSecurity(username);
  assert.equal(state.accountFound, true);
  assert.equal(state.accountStatus, "active");
  assert.equal(state.activeSessionCount, expected.sessions);
  assert.equal(state.activeDeviceCount, expected.devices);
  return state;
}

export function assertNoUnexpectedResponses(network) {
  const unexpected = network.apiResponses
    .filter(
      (response) =>
        response.status === 404 ||
        response.status === 501 ||
        response.status === 429 ||
        response.status >= 500,
    )
    .map(({ method, path, status }) => `${method} ${path} → ${status}`);
  assert.deepEqual(
    unexpected,
    [],
    "The account journey must not depend on missing or failed API endpoints.",
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
