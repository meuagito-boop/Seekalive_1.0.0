import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import {
  authTestBaseUrl,
  createAuthResult,
  createAuthTestPage,
  createDeviceChallenge,
  createPasswordUpdateChallenge,
  jsonResponse,
  launchAuthTestBrowser,
  verifyLocalAppIsRunning,
} from "./authTestBrowser.mjs";

const testPassword = "TesteSeguro!2026";
let browser;

before(async () => {
  await verifyLocalAppIsRunning();
  browser = await launchAuthTestBrowser();
});

after(async () => {
  await browser?.close();
});

function route(path) {
  return new URL(path, authTestBaseUrl).toString();
}

function assertNoUnexpectedAuthRequests(unhandledApiRequests) {
  const unexpectedAuthRequests = unhandledApiRequests.filter((request) =>
    request.includes("/api/v1/auth/"),
  );
  assert.deepEqual(
    unexpectedAuthRequests,
    [],
    "Every auth API request in the journey must have an explicit test response.",
  );
}

function assertNoExternalRequests(blockedExternalRequests) {
  const unapprovedExternalRequests = blockedExternalRequests.filter(
    (origin) => origin !== "https://fonts.googleapis.com",
  );
  assert.deepEqual(
    unapprovedExternalRequests,
    [],
    "The browser journey must not attempt unapproved external origins.",
  );
}

function getRequest(requests, method, path, index = 0) {
  const matches = requests.filter(
    (request) => request.method === method && request.path === path,
  );
  assert.ok(
    matches[index],
    `Expected ${method} ${path} request number ${index + 1}.`,
  );
  return matches[index];
}

test("personal registration confirms e-mail before opening onboarding", async (t) => {
  const { page, requests, unhandledApiRequests, blockedExternalRequests } =
    await createAuthTestPage(browser, {
      "POST /api/v1/auth/register": async () =>
        jsonResponse(202, {
          status: "verification_required",
          message: "Se os dados forem válidos, enviaremos um código.",
        }),
      "POST /api/v1/auth/verification/confirm": async () =>
        jsonResponse(200, createAuthResult({ onboardingCompleted: false })),
    });
  t.after(() => page.close());

  await page.goto(route("/register"), { waitUntil: "domcontentloaded" });
  assert.equal(
    await page.getByTestId("input-business-name").count(),
    0,
    "Personal registration must not show commercial fields.",
  );
  await page.getByTestId("input-first-name").fill("Ana");
  await page.getByTestId("input-last-name").fill("Silva");
  await page.getByTestId("input-age").fill("29");
  await page.getByTestId("input-username").fill("ana_e2e");
  await page.getByTestId("input-email").fill("Ana.E2E@Example.com");
  await page.getByTestId("input-password").fill(testPassword);
  await page.getByTestId("input-confirm-password").fill(testPassword);
  await page
    .getByRole("checkbox", {
      name: "Aceito os Termos de Serviço e a Política de Privacidade",
    })
    .click();
  await page.getByTestId("button-register").click();

  await page.waitForURL((url) => url.pathname === "/verify-email");
  assert.equal(
    await page.getByTestId("input-verification-email").inputValue(),
    "ana.e2e@example.com",
  );

  for (let index = 0; index < 6; index += 1) {
    await page.getByTestId(`input-otp-${index}`).fill(String(index + 1));
  }
  await page.getByTestId("button-verify").click();
  await page.waitForURL((url) => url.pathname === "/onboarding/interests");

  const registration = getRequest(requests, "POST", "/api/v1/auth/register");
  assert.ok(
    registration.body?.accountType === "personal" &&
      registration.body.firstName === "Ana" &&
      registration.body.lastName === "Silva" &&
      registration.body.email === "ana.e2e@example.com" &&
      registration.body.username === "ana_e2e" &&
      registration.body.password === testPassword &&
      registration.body.passwordConfirmation === testPassword &&
      registration.body.acceptedTermsVersion === "v1",
    "Personal registration must send its normalized account payload.",
  );
  assert.equal(
    registration.headers["x-csrf-token"],
    "csrf-e2e",
    "Registration must include the fetched CSRF token.",
  );

  const confirmation = getRequest(
    requests,
    "POST",
    "/api/v1/auth/verification/confirm",
  );
  assert.ok(
    confirmation.body?.email === "ana.e2e@example.com" &&
      confirmation.body.code === "123456",
    "E-mail confirmation must submit the selected address and six-digit code.",
  );
  assertNoUnexpectedAuthRequests(unhandledApiRequests);
  assertNoExternalRequests(blockedExternalRequests);
});

test("commercial registration sends the commercial profile fields", async (t) => {
  const { page, requests, unhandledApiRequests, blockedExternalRequests } =
    await createAuthTestPage(browser, {
      "POST /api/v1/auth/register": async () =>
        jsonResponse(202, {
          status: "verification_required",
          message: "Se os dados forem válidos, enviaremos um código.",
        }),
    });
  t.after(() => page.close());

  await page.goto(route("/register"), { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", {
      name: "Comercial: Seu perfil Social também aparece no Seek",
    })
    .click();
  assert.equal(
    await page.getByTestId("input-first-name").count(),
    0,
    "Commercial registration must not show personal-name fields.",
  );

  await page.getByTestId("input-business-name").fill("Café de Teste");
  await page.getByTestId("input-age").fill("36");
  await page.getByTestId("select-business-category").selectOption("cafes");
  await page.getByTestId("select-discovery-kind").selectOption("provider");
  await page.getByTestId("input-business-address").fill("Rua de Teste, 100");
  await page.getByTestId("input-postal-code").fill("01000-000");
  await page.getByTestId("input-city").fill("São Paulo");
  await page.getByTestId("input-state").fill("SP");
  await page.getByTestId("input-country").fill("Brasil");
  await page.getByTestId("input-username").fill("cafe_e2e");
  await page.getByTestId("input-email").fill("cafe.e2e@example.com");
  await page.getByTestId("input-password").fill(testPassword);
  await page.getByTestId("input-confirm-password").fill(testPassword);
  await page
    .getByRole("checkbox", {
      name: "Aceito os Termos de Serviço e a Política de Privacidade",
    })
    .click();
  await page.getByTestId("button-register").click();

  await page.waitForURL((url) => url.pathname === "/verify-email");
  assert.equal(
    await page.getByTestId("input-verification-email").inputValue(),
    "cafe.e2e@example.com",
  );

  const registration = getRequest(requests, "POST", "/api/v1/auth/register");
  assert.ok(
    registration.body?.accountType === "commercial" &&
      registration.body.businessName === "Café de Teste" &&
      registration.body.categoryKey === "cafes" &&
      registration.body.discoveryKind === "provider" &&
      registration.body.address === "Rua de Teste, 100" &&
      registration.body.postalCode === "01000-000" &&
      registration.body.city === "São Paulo" &&
      registration.body.state === "SP" &&
      registration.body.country === "Brasil" &&
      !Object.hasOwn(registration.body, "firstName") &&
      !Object.hasOwn(registration.body, "lastName"),
    "Commercial registration must send its own profile and address fields.",
  );
  assertNoUnexpectedAuthRequests(unhandledApiRequests);
  assertNoExternalRequests(blockedExternalRequests);
});

test("known-device login reaches the feed with the submitted credentials", async (t) => {
  const { page, requests, unhandledApiRequests, blockedExternalRequests } =
    await createAuthTestPage(browser, {
      "POST /api/v1/auth/login": async () =>
        jsonResponse(200, createAuthResult()),
    });
  t.after(() => page.close());

  await page.goto(route("/login"), { waitUntil: "domcontentloaded" });
  await page.getByTestId("input-identifier").fill("ana@example.com");
  await page.getByTestId("input-password").fill(testPassword);
  await page.getByTestId("button-login").click();
  await page.waitForURL((url) => url.pathname === "/feed");

  const login = getRequest(requests, "POST", "/api/v1/auth/login");
  assert.ok(
    login.body?.identifier === "ana@example.com" &&
      login.body.password === testPassword,
    "Login must send the credentials currently entered by the user.",
  );
  assert.equal(login.headers["x-csrf-token"], "csrf-e2e");
  assertNoUnexpectedAuthRequests(unhandledApiRequests);
  assertNoExternalRequests(blockedExternalRequests);
});

test("unknown-device login requires a code before reaching the feed", async (t) => {
  const { page, requests, unhandledApiRequests, blockedExternalRequests } =
    await createAuthTestPage(browser, {
      "POST /api/v1/auth/login": async () =>
        jsonResponse(202, createDeviceChallenge()),
      "POST /api/v1/auth/device-verification/confirm": async () =>
        jsonResponse(200, createAuthResult()),
    });
  t.after(() => page.close());

  await page.goto(route("/login"), { waitUntil: "domcontentloaded" });
  await page.getByTestId("input-identifier").fill("ana@example.com");
  await page.getByTestId("input-password").fill(testPassword);
  await page.getByTestId("button-login").click();
  await page
    .getByRole("heading", { name: "Confirme esta instalação" })
    .waitFor();
  assert.equal(
    await page.getByTestId("input-identifier").count(),
    0,
    "Credentials should be hidden while the installation is being verified.",
  );

  await page.getByLabel("Código de confirmação").fill("123456");
  await page.getByRole("button", { name: "Confirmar código" }).click();
  await page.waitForURL((url) => url.pathname === "/feed");

  const confirmation = getRequest(
    requests,
    "POST",
    "/api/v1/auth/device-verification/confirm",
  );
  assert.ok(
    confirmation.body?.challengeId === "33333333-3333-4333-8333-333333333333" &&
      confirmation.body.code === "123456",
    "Device confirmation must submit the challenge and entered code.",
  );
  assertNoUnexpectedAuthRequests(unhandledApiRequests);
  assertNoExternalRequests(blockedExternalRequests);
});

test("password-policy update reauthenticates on an unrecognized installation", async (t) => {
  let loginCount = 0;
  const { page, requests, unhandledApiRequests, blockedExternalRequests } =
    await createAuthTestPage(browser, {
      "POST /api/v1/auth/login": async () => {
        loginCount += 1;
        if (loginCount === 1) {
          return jsonResponse(403, {
            error: {
              key: "PASSWORD_UPDATE_REQUIRED",
              message: "Atualize sua senha para continuar.",
            },
          });
        }
        return jsonResponse(202, createDeviceChallenge());
      },
      "POST /api/v1/auth/password/update": async () =>
        jsonResponse(202, createPasswordUpdateChallenge()),
      "POST /api/v1/auth/password/update/confirm": async () =>
        jsonResponse(200, { status: "password_updated" }),
      "POST /api/v1/auth/device-verification/confirm": async () =>
        jsonResponse(200, createAuthResult()),
    });
  t.after(() => page.close());

  await page.goto(route("/login"), { waitUntil: "domcontentloaded" });
  await page.getByTestId("input-identifier").fill("ana@example.com");
  await page.getByTestId("input-password").fill(testPassword);
  await page.getByTestId("button-login").click();
  await page.getByTestId("password-policy-update").waitFor();

  const newPassword = "NovaSenha!2026";
  await page.getByLabel("Nova senha", { exact: true }).fill(newPassword);
  await page
    .getByLabel("Confirme a nova senha", { exact: true })
    .fill(newPassword);
  await page.getByTestId("button-update-password-policy").click();
  await page
    .getByRole("heading", { name: "Confirme a alteração da senha" })
    .waitFor();
  await page.getByLabel("Código de confirmação").fill("654321");
  await page.getByRole("button", { name: "Confirmar alteração" }).click();
  await page
    .getByRole("heading", { name: "Confirme esta instalação" })
    .waitFor();

  const loginAfterUpdate = getRequest(
    requests,
    "POST",
    "/api/v1/auth/login",
    1,
  );
  assert.ok(
    loginAfterUpdate.body?.identifier === "ana@example.com" &&
      loginAfterUpdate.body.password === newPassword,
    "The app must reauthenticate using the new password.",
  );

  await page.getByLabel("Código de confirmação").fill("123456");
  await page.getByRole("button", { name: "Confirmar código" }).click();
  await page.waitForURL((url) => url.pathname === "/feed");

  const update = getRequest(requests, "POST", "/api/v1/auth/password/update");
  const updateConfirmation = getRequest(
    requests,
    "POST",
    "/api/v1/auth/password/update/confirm",
  );
  assert.ok(
    update.body?.identifier === "ana@example.com" &&
      update.body.currentPassword === testPassword &&
      update.body.newPassword === newPassword &&
      update.body.passwordConfirmation === newPassword,
    "Password update must submit the old credential and matching new password.",
  );
  assert.ok(
    updateConfirmation.body?.challengeId === "44444444-4444-4444-8444-444444444444" &&
      updateConfirmation.body.code === "654321",
    "Password update confirmation must submit the issued challenge and code.",
  );
  assertNoUnexpectedAuthRequests(unhandledApiRequests);
  assertNoExternalRequests(blockedExternalRequests);
});
