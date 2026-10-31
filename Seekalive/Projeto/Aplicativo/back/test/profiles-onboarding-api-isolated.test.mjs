import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { eq } from "drizzle-orm";
import {
  assertApiError,
  startIsolatedHttpApiHarness,
} from "./support/isolatedHttpApiHarness.mjs";

let harness;

before(async () => {
  harness = await startIsolatedHttpApiHarness({
    sessionSecret: "seekalive-profiles-onboarding-isolated-test-secret",
    requiredTables: [
      "accountEmails",
      "accountInterests",
      "accountProfiles",
      "accounts",
      "authChallenges",
      "commercialProfiles",
      "passwordCredentials",
    ],
  });
});

after(async () => {
  await harness?.close();
});

test("profile owner and privacy HTTP routes enforce session, CSRF, validation and privacy visibility", async () => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
  const owner = await harness.createVerifiedAccount("personal", `p${suffix}`);
  const otherOwner = await harness.createVerifiedAccount(
    "personal",
    `o${suffix}`,
  );
  const businessOwner = await harness.createVerifiedAccount(
    "commercial",
    `b${suffix}`,
  );

  const unauthenticatedProfile = await harness.request("/api/v1/accounts/me");
  assertApiError(unauthenticatedProfile, 401, "UNAUTHENTICATED");
  const unauthenticatedPrivacy = await harness.request(
    "/api/v1/accounts/me/privacy",
  );
  assertApiError(unauthenticatedPrivacy, 401, "UNAUTHENTICATED");

  const ownerProfile = await harness.request("/api/v1/accounts/me", {
    auth: owner.auth,
  });
  assert.equal(
    ownerProfile.response.status,
    200,
    JSON.stringify(ownerProfile.body),
  );
  assert.equal(ownerProfile.body.account.id, owner.account.id);
  const otherProfile = await harness.request("/api/v1/accounts/me", {
    auth: otherOwner.auth,
  });
  assert.equal(
    otherProfile.response.status,
    200,
    JSON.stringify(otherProfile.body),
  );
  assert.equal(otherProfile.body.account.id, otherOwner.account.id);
  assert.notEqual(otherProfile.body.account.id, ownerProfile.body.account.id);

  const businessProfile = await harness.request("/api/v1/accounts/me", {
    auth: businessOwner.auth,
  });
  assert.equal(
    businessProfile.response.status,
    200,
    JSON.stringify(businessProfile.body),
  );
  assert.equal(businessProfile.body.account.id, businessOwner.account.id);
  assert.equal(businessProfile.body.account.accountType, "commercial");
  assert.ok(businessProfile.body.commercialProfile.address);

  const csrfRequired = await harness.request("/api/v1/accounts/me/privacy", {
    method: "PUT",
    auth: { cookie: owner.cookie },
    body: {
      profileVisibility: "private",
      messages: "circle",
      readReceipts: false,
      version: ownerProfile.body.account.version,
    },
  });
  assertApiError(csrfRequired, 403, "CSRF_REJECTED");

  const invalidPrivacy = await harness.request("/api/v1/accounts/me/privacy", {
    method: "PUT",
    auth: owner.auth,
    body: {
      profileVisibility: "friends",
      messages: "circle",
      readReceipts: false,
      version: ownerProfile.body.account.version,
    },
  });
  assert.equal(
    invalidPrivacy.response.status,
    400,
    JSON.stringify(invalidPrivacy.body),
  );

  const privacy = await harness.request("/api/v1/accounts/me/privacy", {
    auth: owner.auth,
  });
  assert.equal(privacy.response.status, 200, JSON.stringify(privacy.body));
  const privateSettings = await harness.request("/api/v1/accounts/me/privacy", {
    method: "PUT",
    auth: owner.auth,
    body: {
      profileVisibility: "private",
      messages: "circle",
      readReceipts: false,
      version: privacy.body.version,
    },
  });
  assert.equal(
    privateSettings.response.status,
    200,
    JSON.stringify(privateSettings.body),
  );
  assert.equal(privateSettings.body.profileVisibility, "private");

  const stalePrivacyWrite = await harness.request(
    "/api/v1/accounts/me/privacy",
    {
      method: "PUT",
      auth: owner.auth,
      body: {
        profileVisibility: "public",
        messages: "everyone",
        readReceipts: true,
        version: privacy.body.version,
      },
    },
  );
  assertApiError(stalePrivacyWrite, 409, "VERSION_CONFLICT");

  const anonymousView = await harness.request(
    `/api/v1/profiles/${owner.username}`,
  );
  assert.equal(
    anonymousView.response.status,
    200,
    JSON.stringify(anonymousView.body),
  );
  assert.equal(anonymousView.body.visibility.canViewPublicContent, false);
  assert.equal(anonymousView.body.account.isPrivate, true);
  assert.equal(anonymousView.body.account.bio, "");

  const ownerView = await harness.request(
    `/api/v1/profiles/${owner.username}`,
    { auth: owner.auth },
  );
  assert.equal(ownerView.response.status, 200, JSON.stringify(ownerView.body));
  assert.equal(ownerView.body.visibility.canViewPublicContent, true);

  const ownerIdView = await harness.request(
    `/api/v1/accounts/${owner.account.id}`,
  );
  assert.equal(
    ownerIdView.response.status,
    200,
    JSON.stringify(ownerIdView.body),
  );
  assert.equal(ownerIdView.body.id, owner.account.id);
  assert.equal("email" in ownerIdView.body, false);
  assert.equal("age" in ownerIdView.body, false);

  const unauthenticatedAuth = await harness.createPreAuth();
  const unauthenticatedPatch = await harness.request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: unauthenticatedAuth,
    body: {
      bio: "Não autenticado",
      version: ownerProfile.body.account.version,
    },
  });
  assertApiError(unauthenticatedPatch, 401, "UNAUTHENTICATED");

  const csrfRequiredPatch = await harness.request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: { cookie: owner.cookie },
    body: { bio: "Sem CSRF", version: ownerProfile.body.account.version },
  });
  assertApiError(csrfRequiredPatch, 403, "CSRF_REJECTED");
  const latestOwnerProfile = await harness.request("/api/v1/accounts/me", {
    auth: owner.auth,
  });
  assert.equal(latestOwnerProfile.response.status, 200);

  const invalidPatch = await harness.request("/api/v1/accounts/me", {
    method: "PATCH",
    auth: owner.auth,
    body: { age: 25, version: latestOwnerProfile.body.account.version },
  });
  assert.equal(
    invalidPatch.response.status,
    400,
    JSON.stringify(invalidPatch.body),
  );

  const personalBusinessDetailsPatch = await harness.request(
    "/api/v1/accounts/me",
    {
      method: "PATCH",
      auth: owner.auth,
      body: {
        commercialProfile: {
          address: "Rua não permitida, 10",
          postalCode: "01001000",
          cityName: "São Paulo",
          stateName: "SP",
          countryName: "Brasil",
        },
        version: latestOwnerProfile.body.account.version,
      },
    },
  );
  assertApiError(
    personalBusinessDetailsPatch,
    400,
    "ACCOUNT_FIELD_NOT_ALLOWED",
  );

  const commercialPersonalNamePatch = await harness.request(
    "/api/v1/accounts/me",
    {
      method: "PATCH",
      auth: businessOwner.auth,
      body: {
        firstName: "Nome",
        lastName: "Incompatível",
        version: businessProfile.body.account.version,
      },
    },
  );
  assertApiError(commercialPersonalNamePatch, 400, "ACCOUNT_FIELD_NOT_ALLOWED");
});

test("onboarding HTTP route rejects unauthenticated, CSRF-invalid and oversized payloads and replaces prior interests", async () => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
  const owner = await harness.createVerifiedAccount("personal", `p${suffix}`);
  const preAuth = await harness.createPreAuth();

  const unauthenticated = await harness.request(
    "/api/v1/onboarding/interests",
    {
      method: "POST",
      auth: preAuth,
      body: { interests: [], skipped: true },
    },
  );
  assertApiError(unauthenticated, 401, "UNAUTHENTICATED");

  const missingCsrf = await harness.request("/api/v1/onboarding/interests", {
    method: "POST",
    auth: { cookie: owner.cookie },
    body: { interests: [], skipped: true },
  });
  assertApiError(missingCsrf, 403, "CSRF_REJECTED");

  const inconsistentSkip = await harness.request(
    "/api/v1/onboarding/interests",
    {
      method: "POST",
      auth: owner.auth,
      body: { interests: ["cafes"], skipped: true },
    },
  );
  assert.equal(inconsistentSkip.response.status, 400);

  const tooManyInterests = await harness.request(
    "/api/v1/onboarding/interests",
    {
      method: "POST",
      auth: owner.auth,
      body: {
        interests: Array.from(
          { length: 101 },
          (_, index) => `interest-${index}`,
        ),
        skipped: false,
      },
    },
  );
  assert.equal(tooManyInterests.response.status, 400);

  const firstCompletion = await harness.request(
    "/api/v1/onboarding/interests",
    {
      method: "POST",
      auth: owner.auth,
      body: { interests: ["cafes", "gastronomia"], skipped: false },
    },
  );
  assert.equal(
    firstCompletion.response.status,
    200,
    JSON.stringify(firstCompletion.body),
  );
  assert.deepEqual(firstCompletion.body, {
    onboardingCompleted: true,
    interestCount: 2,
  });

  const repeatedCompletion = await harness.request(
    "/api/v1/onboarding/interests",
    {
      method: "POST",
      auth: owner.auth,
      body: { interests: ["cafes", "gastronomia"], skipped: false },
    },
  );
  assert.equal(
    repeatedCompletion.response.status,
    200,
    JSON.stringify(repeatedCompletion.body),
  );
  assert.equal(repeatedCompletion.body.interestCount, 2);

  const skippedCompletion = await harness.request(
    "/api/v1/onboarding/interests",
    {
      method: "POST",
      auth: owner.auth,
      body: { interests: [], skipped: true },
    },
  );
  assert.equal(skippedCompletion.response.status, 200);
  assert.equal(skippedCompletion.body.interestCount, 0);

  const { accountInterests, accounts, db } = harness.database;
  const storedInterests = await db
    .select({ interestKey: accountInterests.interestKey })
    .from(accountInterests)
    .where(eq(accountInterests.accountId, owner.account.id));
  assert.deepEqual(storedInterests, []);
  const [storedAccount] = await db
    .select({ onboardingCompletedAt: accounts.onboardingCompletedAt })
    .from(accounts)
    .where(eq(accounts.id, owner.account.id));
  assert.ok(storedAccount.onboardingCompletedAt instanceof Date);
});
