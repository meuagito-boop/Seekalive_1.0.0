import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import {
  assertApiError,
  startIsolatedHttpApiHarness,
} from "./support/isolatedHttpApiHarness.mjs";

let harness;

before(async () => {
  harness = await startIsolatedHttpApiHarness({
    sessionSecret: "seekalive-public-account-by-id-isolated-test-secret",
    requiredTables: [
      "accounts",
      "accountEmails",
      "accountProfiles",
      "authChallenges",
      "commercialProfiles",
      "passwordCredentials",
    ],
  });
});

after(async () => {
  await harness?.close();
});

function assertPublicAccountDto(account, expected) {
  assert.equal(account.id, expected.id);
  assert.equal(account.username, expected.username);
  assert.equal(account.accountType, expected.accountType);
  assert.equal(typeof account.displayName, "string");

  assert.deepEqual(Object.keys(account).sort(), [
    "accountType",
    "avatarUrl",
    "bio",
    "coverUrl",
    "displayName",
    "id",
    "isPrivate",
    "joinedAt",
    "location",
    "relationship",
    "stats",
    "username",
    "version",
    "website",
  ]);
  assert.deepEqual(Object.keys(account.relationship).sort(), [
    "blockedByMe",
    "blockedByThem",
    "following",
    "inCircle",
    "mutedByMe",
  ]);
  assert.deepEqual(Object.keys(account.stats).sort(), [
    "circles",
    "followers",
    "following",
    "posts",
  ]);

  const serializedAccount = JSON.stringify(account).toLowerCase();
  for (const privateValue of expected.privateValues) {
    assert.equal(
      serializedAccount.includes(privateValue.toLowerCase()),
      false,
      `Public DTO must not contain private registration value "${privateValue}".`,
    );
  }

  const forbiddenKeys =
    /^(?:email|dateofbirth|birthdate|age|password|passwordconfirmation|phone|address|postalcode|city|state|country|firstname|lastname)$/i;
  function assertNoPrivateKeys(value) {
    if (!value || typeof value !== "object") return;
    for (const [key, nestedValue] of Object.entries(value)) {
      assert.equal(
        forbiddenKeys.test(key),
        false,
        `Public DTO must not expose private field "${key}".`,
      );
      assertNoPrivateKeys(nestedValue);
    }
  }
  assertNoPrivateKeys(account);
}

test("public account-by-id HTTP route exposes personal and commercial accounts without private data", async () => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const personal = await harness.createVerifiedAccount("personal", `p${suffix}`);
  const commercial = await harness.createVerifiedAccount(
    "commercial",
    `b${suffix}`,
  );

  for (const created of [personal, commercial]) {
    const result = await harness.request(`/api/v1/accounts/${created.account.id}`);
    assert.equal(result.response.status, 200, JSON.stringify(result.body));
    assertPublicAccountDto(result.body, {
      id: created.account.id,
      username: created.username,
      accountType: created.registration.accountType,
      privateValues: [
        created.email,
        created.registration.dateOfBirth,
        created.password,
        ...(created.registration.address ? [created.registration.address] : []),
        ...(created.registration.postalCode
          ? [created.registration.postalCode]
          : []),
      ],
    });
  }
});

test("public account-by-id HTTP route returns ACCOUNT_NOT_FOUND for malformed and unknown IDs", async () => {
  const malformed = await harness.request("/api/v1/accounts/not-a-uuid");
  assertApiError(malformed, 404, "ACCOUNT_NOT_FOUND");

  const unknown = await harness.request(`/api/v1/accounts/${randomUUID()}`);
  assertApiError(unknown, 404, "ACCOUNT_NOT_FOUND");
});
