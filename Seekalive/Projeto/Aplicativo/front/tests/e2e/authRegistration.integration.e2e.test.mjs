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

function assertNoUnexpectedResponses(
  apiResponses,
  allowedFailureStatuses = [],
) {
  const unexpected = apiResponses
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
    "The account journey must not depend on missing or failed API endpoints.",
  );
}

function assertLocalOnlyNetwork({
  apiTransportFailures,
  blockedExternalRequests,
  allowedExternalOrigins,
}) {
  assert.deepEqual(apiTransportFailures, []);
  const unapprovedOrigins = blockedExternalRequests.filter(
    (origin) => !allowedExternalOrigins.has(origin),
  );
  assert.deepEqual(
    unapprovedOrigins,
    [],
    "The browser journey attempted an unapproved external request.",
  );
}

async function registrationState({
  accountType,
  email,
  username,
  firstName,
  lastName,
  businessName,
  categoryKey,
  discoveryKind,
  address,
  postalCode,
  city,
  state,
  country,
}) {
  return isolatedApi.verifyRegistration({
    accountType,
    email,
    username,
    firstName,
    lastName,
    businessName,
    categoryKey,
    discoveryKind,
    address,
    postalCode,
    city,
    state,
    country,
  });
}

async function confirmEmailAndVerifyPersistence({
  t,
  page,
  network,
  accountType,
  email,
  username,
  expectedRegistration,
}) {
  const verificationEmail = isolatedApi.waitForVerificationEmail(email);
  await page.getByTestId("button-register").click();
  await page.waitForURL((url) => url.pathname === "/verify-email");
  assert.equal(
    await page.getByTestId("input-verification-email").inputValue(),
    email,
  );

  const capturedEmail = await verificationEmail;
  assert.match(capturedEmail.code, /^\d{6}$/);

  const pendingState = await registrationState({
    accountType,
    email,
    username,
    ...expectedRegistration,
  });
  assert.equal(pendingState.accountFound, true);
  assert.equal(pendingState.accountTypeMatches, true);
  assert.equal(pendingState.accountStatus, "pending_verification");
  assert.equal(pendingState.emailVerified, false);
  assert.equal(pendingState.identityMatches, true);
  assert.equal(pendingState.termsRecorded, true);
  assert.equal(pendingState.passwordIsArgon2id, true);
  assert.equal(pendingState.sessionExists, false);
  assert.equal(pendingState.verificationEmailCaptured, true);
  assert.equal(pendingState.commercialProfileMatches, true);

  for (let index = 0; index < capturedEmail.code.length; index += 1) {
    await page
      .getByLabel(`Dígito ${index + 1} do código de confirmação por e-mail`, {
        exact: true,
      })
      .fill(capturedEmail.code[index]);
  }
  await page.getByTestId("button-verify").click();
  await page.waitForURL((url) => url.pathname === "/onboarding/interests");
  await page.waitForLoadState("networkidle");

  const confirmation = network.apiResponses.findLast(
    (response) =>
      response.method === "POST" &&
      response.path === "/api/v1/auth/verification/confirm",
  );
  assert.equal(confirmation?.status, 200);
  assert.equal(confirmation?.payload?.emailVerified, true);
  assert.equal(confirmation?.payload?.account?.accountType, accountType);
  assert.equal(
    Object.hasOwn(confirmation?.payload?.account ?? {}, "age"),
    false,
    "Age must not be exposed in the authenticated account response.",
  );
  assert.equal(
    Object.hasOwn(confirmation?.payload?.account ?? {}, "password"),
    false,
  );

  const verifiedState = await registrationState({
    accountType,
    email,
    username,
    ...expectedRegistration,
  });
  assert.equal(verifiedState.accountFound, true);
  assert.equal(verifiedState.accountTypeMatches, true);
  assert.equal(verifiedState.accountStatus, "active");
  assert.equal(verifiedState.emailVerified, true);
  assert.equal(verifiedState.identityMatches, true);
  assert.equal(verifiedState.termsRecorded, true);
  assert.equal(verifiedState.passwordIsArgon2id, true);
  assert.equal(verifiedState.sessionExists, true);
  assert.equal(verifiedState.verificationEmailCaptured, true);
  assert.equal(verifiedState.commercialProfileMatches, true);

  assertNoUnexpectedResponses(network.apiResponses);
  assertLocalOnlyNetwork(network);
  t.diagnostic(
    `${accountType} registration reached onboarding, verified the email, and persisted only in the isolated test schema.`,
  );
}

async function fillPersonalRegistration(page, registration) {
  await page.getByTestId("input-first-name").fill(registration.firstName);
  await page.getByTestId("input-last-name").fill(registration.lastName);
  await page.getByTestId("input-age").fill(registration.age ?? "29");
  await page.getByTestId("input-username").fill(registration.username);
  await page.getByTestId("input-email").fill(registration.email);
  await page.getByTestId("input-password").fill(testPassword);
  await page.getByTestId("input-confirm-password").fill(testPassword);
  await page
    .getByRole("checkbox", {
      name: "Aceito os Termos de Serviço e Política de Privacidade",
    })
    .click();
}

test("personal signup verifies email and persists only in the isolated schema", async (t) => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
  const email = `personal.${suffix}@example.com`;
  const username = `e2e_p_${suffix}`;
  const network = await createAuthIntegrationPage(
    browser,
    isolatedApi.apiBaseUrl,
  );
  t.after(() => network.page.close());

  await network.page.goto(new URL("/register", authTestBaseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  await fillPersonalRegistration(network.page, {
    firstName: "Ana",
    lastName: "Silva",
    username,
    email,
  });

  await confirmEmailAndVerifyPersistence({
    t,
    page: network.page,
    network,
    accountType: "personal",
    email,
    username,
    expectedRegistration: {
      firstName: "Ana",
      lastName: "Silva",
    },
  });
});

test("commercial signup persists the social account and Seek business profile", async (t) => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
  const email = `commercial.${suffix}@example.com`;
  const username = `e2e_c_${suffix}`;
  const businessName = `Café E2E ${suffix}`;
  const network = await createAuthIntegrationPage(
    browser,
    isolatedApi.apiBaseUrl,
  );
  t.after(() => network.page.close());

  await network.page.goto(new URL("/register", authTestBaseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  await network.page
    .getByRole("button", {
      name: "Comercial: Seu perfil Social também aparece no Seek",
    })
    .click();
  await network.page.getByTestId("input-business-name").fill(businessName);
  await network.page.getByTestId("input-age").fill("36");
  await network.page
    .getByTestId("select-business-category")
    .selectOption("cafes");
  await network.page
    .getByTestId("select-discovery-kind")
    .selectOption("provider");
  await network.page
    .getByTestId("input-business-address")
    .fill("Rua de Teste, 100");
  await network.page.getByTestId("input-postal-code").fill("01000-000");
  await network.page.getByTestId("input-city").fill("São Paulo");
  await network.page.getByTestId("input-state").fill("SP");
  await network.page.getByTestId("input-country").fill("Brasil");
  await network.page.getByTestId("input-username").fill(username);
  await network.page.getByTestId("input-email").fill(email);
  await network.page.getByTestId("input-password").fill(testPassword);
  await network.page.getByTestId("input-confirm-password").fill(testPassword);
  await network.page
    .getByRole("checkbox", {
      name: "Aceito os Termos de Serviço e Política de Privacidade",
    })
    .click();

  await confirmEmailAndVerifyPersistence({
    t,
    page: network.page,
    network,
    accountType: "commercial",
    email,
    username,
    expectedRegistration: {
      businessName,
      categoryKey: "cafes",
      discoveryKind: "provider",
      address: "Rua de Teste, 100",
      postalCode: "01000-000",
      city: "São Paulo",
      state: "SP",
      country: "Brasil",
    },
  });
});

test("failed verification email keeps the account pending and sessionless", async (t) => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
  const email = `delivery-failure.${suffix}@example.com`;
  const username = `e2e_f_${suffix}`;
  const network = await createAuthIntegrationPage(
    browser,
    isolatedApi.apiBaseUrl,
  );
  t.after(() => network.page.close());

  await network.page.goto(new URL("/register", authTestBaseUrl).toString(), {
    waitUntil: "domcontentloaded",
  });
  await fillPersonalRegistration(network.page, {
    firstName: "Bruna",
    lastName: "Teste",
    username,
    email,
  });
  await isolatedApi.failVerificationDelivery(email);

  const registrationResponse = network.page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/v1/auth/register" &&
      response.request().method() === "POST"
    );
  });
  await network.page.getByTestId("button-register").click();
  const response = await registrationResponse;
  assert.equal(response.status(), 503);
  const payload = await response.json();
  assert.equal(payload.error?.key, "EMAIL_DELIVERY_UNAVAILABLE");
  await network.page.getByText(/e-mail não pôde ser enviado/i).waitFor();
  assert.equal(new URL(network.page.url()).pathname, "/register");

  const pendingState = await registrationState({
    accountType: "personal",
    email,
    username,
    firstName: "Bruna",
    lastName: "Teste",
  });
  assert.equal(pendingState.accountFound, true);
  assert.equal(pendingState.accountTypeMatches, true);
  assert.equal(pendingState.accountStatus, "pending_verification");
  assert.equal(pendingState.emailVerified, false);
  assert.equal(pendingState.identityMatches, true);
  assert.equal(pendingState.termsRecorded, true);
  assert.equal(pendingState.passwordIsArgon2id, true);
  assert.equal(pendingState.sessionExists, false);
  assert.equal(pendingState.verificationEmailCaptured, false);
  assert.equal(pendingState.commercialProfileMatches, true);

  assertNoUnexpectedResponses(network.apiResponses, [503]);
  assertLocalOnlyNetwork(network);
});
