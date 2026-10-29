import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import {
  authTestBaseUrl,
  launchAuthTestBrowser,
  verifyLocalAppIsRunning,
} from "./authTestBrowser.mjs";
import {
  assertNoUnexpectedResponses,
  fillLogin,
  inspectSecurityState,
  loginResponseFor,
  registerPersonalAccount,
} from "./authAccountIntegrationJourney.mjs";
import {
  createAuthIntegrationPage,
  startIsolatedAuthRegistrationApi,
} from "./authRegistrationIntegrationSupport.mjs";

const originalPassword = "TesteSeguro!2026";
const recoveredPassword = "Recuperada!2026Segura";
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

function passwordResetRequestResponse(page) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/v1/auth/password/reset/request" &&
      response.request().method() === "POST"
    );
  });
}

function passwordResetConfirmationResponse(page) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/v1/auth/password/reset/confirm" &&
      response.request().method() === "POST"
    );
  });
}

function deviceConfirmationResponse(page) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/v1/auth/device-verification/confirm" &&
      response.request().method() === "POST"
    );
  });
}

async function submitResetRequest(page, email) {
  await page.getByTestId("input-email").fill(email);
  const responsePromise = passwordResetRequestResponse(page);
  await page.getByTestId("button-send-reset").click();
  return responsePromise;
}

async function submitPasswordReset(page, { code, password }) {
  await page.getByTestId("input-reset-code").fill(code);
  await page.getByTestId("input-reset-password").fill(password);
  await page.getByTestId("input-reset-password-confirmation").fill(password);
  const responsePromise = passwordResetConfirmationResponse(page);
  await page.getByTestId("button-confirm-reset").click();
  return responsePromise;
}

test("forgot-password UI preserves privacy, resets credentials, and revokes prior access in isolated persistence", async (t) => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
  const email = `recovery.${suffix}@example.com`;
  const username = `recovery_${suffix}`;
  const unknownEmail = `missing.${suffix}@example.com`;
  const accountNetwork = await createAuthIntegrationPage(
    browser,
    isolatedApi.apiBaseUrl,
  );
  let recoveryNetwork;
  t.after(async () => {
    await Promise.all([
      accountNetwork.page.close(),
      recoveryNetwork?.page.close(),
    ]);
  });

  const existingAccountPage = await registerPersonalAccount({
    network: accountNetwork,
    isolatedApi,
    email,
    username,
    password: originalPassword,
  });
  await inspectSecurityState(isolatedApi, username, {
    sessions: 1,
    devices: 1,
  });

  recoveryNetwork = await createAuthIntegrationPage(
    browser,
    isolatedApi.apiBaseUrl,
  );
  const page = recoveryNetwork.page;
  await page.goto(new URL("/login", authTestBaseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  await page.getByTestId("link-forgot-password").click();
  await page.waitForURL((url) => url.pathname === "/forgot-password");
  await page.getByRole("heading", { name: "Esqueceu a senha?" }).waitFor();

  const unknownRequestResponse = await submitResetRequest(page, unknownEmail);
  assert.equal(unknownRequestResponse.status(), 202);
  const unknownRequestBody = await unknownRequestResponse.json();
  assert.equal(unknownRequestBody.status, "reset_requested");
  await page.getByRole("heading", { name: "Redefina sua senha" }).waitFor();

  await page.getByRole("button", { name: "Corrigir e-mail" }).click();
  await page.getByRole("heading", { name: "Esqueceu a senha?" }).waitFor();
  const resetEmailPromise = isolatedApi.waitForPasswordResetEmail(email);
  const knownRequestResponsePromise = submitResetRequest(page, email);
  const knownRequestResponse = await knownRequestResponsePromise;
  assert.equal(knownRequestResponse.status(), 202);
  const knownRequestBody = await knownRequestResponse.json();
  assert.deepEqual(
    knownRequestBody,
    unknownRequestBody,
    "The public response must not reveal whether the account exists.",
  );
  const resetEmail = await resetEmailPromise;
  assert.equal(
    /^\d{6}$/.test(resetEmail.code),
    true,
    "The isolated test email sink must capture a six-digit reset code.",
  );
  await page.getByRole("heading", { name: "Redefina sua senha" }).waitFor();

  const invalidCode = resetEmail.code === "000000" ? "000001" : "000000";
  const invalidResetResponse = await submitPasswordReset(page, {
    code: invalidCode,
    password: recoveredPassword,
  });
  assert.equal(invalidResetResponse.status(), 400);
  const invalidResetBody = await invalidResetResponse.json();
  assert.equal(invalidResetBody.error?.key, "INVALID_PASSWORD_RESET");
  await page.getByRole("alert").waitFor();
  await page.getByRole("heading", { name: "Redefina sua senha" }).waitFor();

  const validResetResponse = await submitPasswordReset(page, {
    code: resetEmail.code,
    password: recoveredPassword,
  });
  assert.equal(validResetResponse.status(), 200);
  const validResetBody = await validResetResponse.json();
  assert.equal(validResetBody.status, "password_reset");
  await page.getByRole("heading", { name: "Senha atualizada" }).waitFor();

  const oldSessionState = await existingAccountPage.evaluate(async () => {
    const response = await fetch("/api/v1/auth/session", {
      credentials: "include",
    });
    return response.json();
  });
  assert.equal(oldSessionState.authenticated, false);
  await inspectSecurityState(isolatedApi, username, {
    sessions: 0,
    devices: 0,
  });

  await page.getByTestId("button-reset-login").click();
  await page.waitForURL((url) => url.pathname === "/login");
  const oldPasswordResponsePromise = loginResponseFor(page);
  await fillLogin(page, email, originalPassword);
  const oldPasswordResponse = await oldPasswordResponsePromise;
  assert.equal(oldPasswordResponse.status(), 401);
  await inspectSecurityState(isolatedApi, username, {
    sessions: 0,
    devices: 0,
  });

  const deviceLoginEmailPromise = isolatedApi.waitForDeviceLoginEmail(email);
  const newPasswordResponsePromise = loginResponseFor(page);
  await fillLogin(page, email, recoveredPassword);
  const newPasswordResponse = await newPasswordResponsePromise;
  assert.equal(newPasswordResponse.status(), 202);
  const deviceLoginEmail = await deviceLoginEmailPromise;
  assert.equal(
    /^\d{6}$/.test(deviceLoginEmail.code),
    true,
    "Password recovery must require a new-device confirmation after revocation.",
  );
  await page
    .getByRole("heading", { name: "Confirme esta instalação" })
    .waitFor();
  await inspectSecurityState(isolatedApi, username, {
    sessions: 0,
    devices: 0,
  });

  const deviceConfirmationPromise = deviceConfirmationResponse(page);
  await page.getByLabel("Código de confirmação").fill(deviceLoginEmail.code);
  await page.getByRole("button", { name: "Confirmar código" }).click();
  const deviceConfirmation = await deviceConfirmationPromise;
  assert.equal(deviceConfirmation.status(), 200);
  await page.waitForURL(
    (url) =>
      url.pathname === "/feed" || url.pathname === "/onboarding/interests",
  );
  await inspectSecurityState(isolatedApi, username, {
    sessions: 1,
    devices: 1,
  });

  assertNoUnexpectedResponses(accountNetwork);
  assertNoUnexpectedResponses(recoveryNetwork);
  t.diagnostic(
    "Unknown and registered emails returned the same public response; a wrong code was rejected; the correct code changed the password and revoked old sessions/devices; the recovered password required a fresh device confirmation.",
  );
});
