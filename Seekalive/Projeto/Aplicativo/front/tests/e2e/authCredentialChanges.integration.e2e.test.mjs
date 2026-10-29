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

const currentPassword = "TesteSeguro!2026";
const changedPassword = "TrocaSegura!2026";
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

function apiResponse(page, path, method = "POST") {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === path && response.request().method() === method;
  });
}

async function submitEmailChangeRequest(page, email, password) {
  await page.getByLabel("Novo endereço de e-mail").fill(email);
  await page
    .getByLabel("Senha atual para autorizar a troca de e-mail")
    .fill(password);
  const responsePromise = apiResponse(
    page,
    "/api/v1/auth/account/email/change/request",
  );
  await page
    .getByRole("button", {
      name: "Enviar código ao e-mail atual",
      exact: true,
    })
    .first()
    .click();
  return responsePromise;
}

async function submitEmailChangeCode(page, endpoint, code, buttonName) {
  await page.getByLabel("Código de confirmação do e-mail").fill(code);
  const responsePromise = apiResponse(page, endpoint);
  await page.getByRole("button", { name: buttonName, exact: true }).click();
  return responsePromise;
}

async function submitPasswordChangeRequest(page) {
  await page.getByLabel("Senha atual", { exact: true }).fill(currentPassword);
  await page.getByLabel("Nova senha", { exact: true }).fill(changedPassword);
  await page
    .getByLabel("Confirme a nova senha", { exact: true })
    .fill(changedPassword);
  const responsePromise = apiResponse(
    page,
    "/api/v1/auth/account/password/change/request",
  );
  await page
    .getByRole("button", {
      name: "Enviar código ao e-mail atual",
      exact: true,
    })
    .last()
    .click();
  return responsePromise;
}

async function submitPasswordChangeCode(page, code) {
  await page.getByLabel("Código para confirmar a troca de senha").fill(code);
  const responsePromise = apiResponse(
    page,
    "/api/v1/auth/account/password/change/confirm",
  );
  await page
    .getByRole("button", {
      name: "Confirmar troca e encerrar sessões",
      exact: true,
    })
    .click();
  return responsePromise;
}

function wrongCodeFor(code) {
  return code === "000000" ? "000001" : "000000";
}

async function accountSessionState(page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/v1/auth/session", {
      credentials: "include",
    });
    return response.json();
  });
}

test("account email and password changes preserve confirmation and revocation rules", async (t) => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
  const currentEmail = `change.${suffix}@example.com`;
  const newEmail = `changed.${suffix}@example.com`;
  const username = `change_${suffix}`;
  const accountNetwork = await createAuthIntegrationPage(
    browser,
    isolatedApi.apiBaseUrl,
  );
  let loginNetwork;
  t.after(async () => {
    await Promise.all([
      accountNetwork.page.close(),
      loginNetwork?.page.close(),
    ]);
  });

  const settingsPage = await registerPersonalAccount({
    network: accountNetwork,
    isolatedApi,
    email: currentEmail,
    username,
    password: currentPassword,
  });
  await inspectSecurityState(isolatedApi, username, {
    sessions: 1,
    devices: 1,
    email: currentEmail,
  });

  await settingsPage.goto(
    new URL("/settings/account", authTestBaseUrl).toString(),
    { waitUntil: "domcontentloaded" },
  );
  await settingsPage
    .getByRole("heading", { name: "Trocar e-mail", exact: true })
    .waitFor();
  await settingsPage
    .getByRole("heading", { name: "Trocar senha", exact: true })
    .waitFor();

  const invalidPasswordResponse = await submitEmailChangeRequest(
    settingsPage,
    newEmail,
    "SenhaIncorreta!2026",
  );
  assert.equal(invalidPasswordResponse.status(), 401);
  assert.equal(
    await settingsPage.getByRole("alert").textContent(),
    "A senha atual está incorreta.",
  );
  await inspectSecurityState(isolatedApi, username, {
    sessions: 1,
    devices: 1,
    email: currentEmail,
  });

  const currentEmailCodePromise =
    isolatedApi.waitForAccountEmailChangeCurrentEmail(currentEmail);
  const validEmailRequest = await submitEmailChangeRequest(
    settingsPage,
    newEmail,
    currentPassword,
  );
  assert.equal(validEmailRequest.status(), 202);
  const currentEmailCode = await currentEmailCodePromise;
  assert.match(currentEmailCode.code, /^\d{6}$/);

  const invalidCurrentCodeResponse = await submitEmailChangeCode(
    settingsPage,
    "/api/v1/auth/account/email/change/confirm-current",
    wrongCodeFor(currentEmailCode.code),
    "Confirmar e enviar ao novo e-mail",
  );
  assert.equal(invalidCurrentCodeResponse.status(), 400);
  assert.ok(await settingsPage.getByRole("alert").textContent());
  await inspectSecurityState(isolatedApi, username, {
    sessions: 1,
    devices: 1,
    email: currentEmail,
  });

  const newEmailCodePromise =
    isolatedApi.waitForAccountEmailChangeNewEmail(newEmail);
  const currentEmailConfirmation = await submitEmailChangeCode(
    settingsPage,
    "/api/v1/auth/account/email/change/confirm-current",
    currentEmailCode.code,
    "Confirmar e enviar ao novo e-mail",
  );
  assert.equal(currentEmailConfirmation.status(), 202);
  const newEmailCode = await newEmailCodePromise;
  assert.match(newEmailCode.code, /^\d{6}$/);
  await inspectSecurityState(isolatedApi, username, {
    sessions: 1,
    devices: 1,
    email: currentEmail,
  });

  const invalidNewCodeResponse = await submitEmailChangeCode(
    settingsPage,
    "/api/v1/auth/account/email/change/confirm-new",
    wrongCodeFor(newEmailCode.code),
    "Confirmar novo e-mail",
  );
  assert.equal(invalidNewCodeResponse.status(), 400);
  assert.ok(await settingsPage.getByRole("alert").textContent());
  await inspectSecurityState(isolatedApi, username, {
    sessions: 1,
    devices: 1,
    email: currentEmail,
  });

  const securityNoticePromise =
    isolatedApi.waitForAccountEmailChangeSecurityNotice(currentEmail);
  const newEmailConfirmation = await submitEmailChangeCode(
    settingsPage,
    "/api/v1/auth/account/email/change/confirm-new",
    newEmailCode.code,
    "Confirmar novo e-mail",
  );
  assert.equal(newEmailConfirmation.status(), 200);
  const newEmailConfirmationBody = await newEmailConfirmation.json();
  assert.equal(newEmailConfirmationBody.status, "email_changed");
  assert.equal(newEmailConfirmationBody.securityNoticeSent, true);
  const securityNotice = await securityNoticePromise;
  assert.match(securityNotice.newEmailMasked, /@example\.com$/);
  await inspectSecurityState(isolatedApi, username, {
    sessions: 1,
    devices: 1,
    email: newEmail,
  });
  const oldEmailIsStillCurrent = await isolatedApi.inspectAccountSecurity(
    username,
    currentEmail,
  );
  assert.equal(oldEmailIsStillCurrent.emailMatches, false);

  loginNetwork = await createAuthIntegrationPage(
    browser,
    isolatedApi.apiBaseUrl,
  );
  const loginPage = loginNetwork.page;
  await loginPage.goto(new URL("/login", authTestBaseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  const oldEmailLoginResponsePromise = loginResponseFor(loginPage);
  await fillLogin(loginPage, currentEmail, currentPassword);
  const oldEmailLoginResponse = await oldEmailLoginResponsePromise;
  assert.equal(oldEmailLoginResponse.status(), 401);

  const deviceLoginEmailPromise = isolatedApi.waitForDeviceLoginEmail(newEmail);
  const newEmailLoginResponsePromise = loginResponseFor(loginPage);
  await fillLogin(loginPage, newEmail, currentPassword);
  const newEmailLoginResponse = await newEmailLoginResponsePromise;
  assert.equal(newEmailLoginResponse.status(), 202);
  const deviceLoginEmail = await deviceLoginEmailPromise;
  assert.match(deviceLoginEmail.code, /^\d{6}$/);
  await loginPage
    .getByRole("heading", { name: "Confirme esta instalação" })
    .waitFor();
  const deviceConfirmationResponsePromise = apiResponse(
    loginPage,
    "/api/v1/auth/device-verification/confirm",
  );
  await loginPage
    .getByLabel("Código de confirmação")
    .fill(deviceLoginEmail.code);
  await loginPage
    .getByRole("button", { name: "Confirmar código", exact: true })
    .click();
  const deviceConfirmationResponse = await deviceConfirmationResponsePromise;
  assert.equal(deviceConfirmationResponse.status(), 200);
  await loginPage.waitForURL(
    (url) =>
      url.pathname === "/feed" || url.pathname === "/onboarding/interests",
  );
  await inspectSecurityState(isolatedApi, username, {
    sessions: 2,
    devices: 2,
    email: newEmail,
  });

  const passwordChangeEmailPromise =
    isolatedApi.waitForAccountPasswordChangeEmail(newEmail);
  const passwordRequest = await submitPasswordChangeRequest(settingsPage);
  assert.equal(passwordRequest.status(), 202);
  const passwordChangeEmail = await passwordChangeEmailPromise;
  assert.match(passwordChangeEmail.code, /^\d{6}$/);

  const invalidPasswordCodeResponse = await submitPasswordChangeCode(
    settingsPage,
    wrongCodeFor(passwordChangeEmail.code),
  );
  assert.equal(invalidPasswordCodeResponse.status(), 400);
  assert.ok(await settingsPage.getByRole("alert").textContent());
  await inspectSecurityState(isolatedApi, username, {
    sessions: 2,
    devices: 2,
    email: newEmail,
  });

  const passwordConfirmation = await submitPasswordChangeCode(
    settingsPage,
    passwordChangeEmail.code,
  );
  assert.equal(passwordConfirmation.status(), 200);
  const passwordConfirmationBody = await passwordConfirmation.json();
  assert.equal(passwordConfirmationBody.status, "password_changed");
  await settingsPage.waitForURL((url) => url.pathname === "/login");
  assert.equal((await accountSessionState(settingsPage)).authenticated, false);
  assert.equal((await accountSessionState(loginPage)).authenticated, false);
  await inspectSecurityState(isolatedApi, username, {
    sessions: 0,
    devices: 0,
    email: newEmail,
  });

  await loginPage.goto(new URL("/login", authTestBaseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  await loginPage.getByTestId("input-identifier").waitFor();
  const oldPasswordLoginResponsePromise = loginResponseFor(loginPage);
  await fillLogin(loginPage, newEmail, currentPassword);
  const oldPasswordLoginResponse = await oldPasswordLoginResponsePromise;
  assert.equal(oldPasswordLoginResponse.status(), 401);

  const freshDeviceEmailPromise = isolatedApi.waitForDeviceLoginEmail(newEmail);
  const changedPasswordLoginResponsePromise = loginResponseFor(loginPage);
  await fillLogin(loginPage, newEmail, changedPassword);
  const changedPasswordLoginResponse =
    await changedPasswordLoginResponsePromise;
  assert.equal(changedPasswordLoginResponse.status(), 202);
  const freshDeviceEmail = await freshDeviceEmailPromise;
  assert.match(freshDeviceEmail.code, /^\d{6}$/);
  await loginPage
    .getByRole("heading", { name: "Confirme esta instalação" })
    .waitFor();
  const freshDeviceConfirmationPromise = apiResponse(
    loginPage,
    "/api/v1/auth/device-verification/confirm",
  );
  await loginPage
    .getByLabel("Código de confirmação")
    .fill(freshDeviceEmail.code);
  await loginPage
    .getByRole("button", { name: "Confirmar código", exact: true })
    .click();
  const freshDeviceConfirmation = await freshDeviceConfirmationPromise;
  const freshDeviceConfirmationBody = await freshDeviceConfirmation.json();
  assert.equal(
    freshDeviceConfirmation.status(),
    200,
    `Device confirmation failed: ${freshDeviceConfirmationBody.error?.key ?? "unexpected_response"}`,
  );
  await loginPage.waitForURL(
    (url) =>
      url.pathname === "/feed" || url.pathname === "/onboarding/interests",
  );
  await inspectSecurityState(isolatedApi, username, {
    sessions: 1,
    devices: 1,
    email: newEmail,
  });

  assertNoUnexpectedResponses(accountNetwork);
  assertNoUnexpectedResponses(loginNetwork);
  t.diagnostic(
    "Email stayed unchanged until both codes were confirmed, the old address received a security notice, the new address authenticated, invalid codes were rejected, and password change revoked all sessions/devices before requiring fresh device confirmation.",
  );
});
