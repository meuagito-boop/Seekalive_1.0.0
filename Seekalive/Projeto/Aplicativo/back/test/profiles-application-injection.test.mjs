import assert from "node:assert/strict";
import { test } from "node:test";
import { createCommercialProfileLoader } from "../src/modules/profiles/application/commercialProfile.ts";
import { createOwnerProfileIdentityLoader } from "../src/modules/profiles/application/ownerProfileCommon.ts";
import { createPrivacySettingsService } from "../src/modules/profiles/application/privacySettings.ts";
import { createOwnerProfileUpdater } from "../src/modules/profiles/application/updateOwnerProfile.ts";
import { createUsernameAvailabilityChecker } from "../src/modules/profiles/application/usernameAvailability.ts";

const identity = {
  ok: true,
  accountType: "commercial",
  data: {
    account: { id: "account-id" },
    email: "owner@example.test",
    firstName: null,
    lastName: null,
    publicNameChangeAvailableAt: "2026-02-01T00:00:00.000Z",
    usernameChangeAvailableAt: "2026-02-01T00:00:00.000Z",
  },
};

test("username availability normalizes valid input and skips persistence for invalid input", async () => {
  const checked = [];
  const checkUsername = createUsernameAvailabilityChecker(async (username) => {
    checked.push(username);
    return username === "taken_name";
  });

  assert.deepEqual(await checkUsername("  @Taken_Name "), {
    kind: "unavailable",
    normalizedUsername: "taken_name",
  });
  assert.deepEqual(await checkUsername("bad name"), { kind: "invalid" });
  assert.deepEqual(await checkUsername("my_seek_alive_2026"), {
    kind: "unavailable",
    normalizedUsername: "my_seek_alive_2026",
  });
  assert.deepEqual(await checkUsername("s33k4l1v3"), {
    kind: "unavailable",
    normalizedUsername: "s33k4l1v3",
  });
  assert.deepEqual(await checkUsername("cafe-com-leite"), {
    kind: "available",
    normalizedUsername: "cafe-com-leite",
  });
  assert.deepEqual(checked, ["taken_name", "cafe-com-leite"]);
});

test("owner identity loader composes account view and verified owner details", async () => {
  const calls = [];
  const loadIdentity = createOwnerProfileIdentityLoader({
    findActiveAccountById: async (accountId) => ({
      id: accountId,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    }),
    accountView: async (account, viewerId) => {
      calls.push(["view", account.id, viewerId]);
      return { id: account.id, displayName: "Comércio" };
    },
    findOwnerProfileIdentity: async (accountId) => {
      calls.push(["identity", accountId]);
      return {
        accountType: "commercial",
        email: "verified@example.test",
        firstName: null,
        lastName: null,
        publicNameChangedAt: null,
        usernameChangedAt: null,
      };
    },
  });

  const result = await loadIdentity("account-id");
  assert.equal(result.ok, true);
  assert.equal(result.accountType, "commercial");
  assert.equal(result.data.email, "verified@example.test");
  assert.deepEqual(calls, [
    ["identity", "account-id"],
    ["view", "account-id", "account-id"],
  ]);
});

test("commercial profile loader avoids repository access for a personal account", async () => {
  let repositoryCalled = false;
  const loadCommercial = createCommercialProfileLoader(async () => {
    repositoryCalled = true;
    return null;
  });

  const result = await loadCommercial("account-id", {
    ...identity,
    accountType: "personal",
  });
  assert.deepEqual(result, {
    ok: false,
    status: 409,
    code: "ACCOUNT_TYPE_MISMATCH",
    message: "Esta conta não possui perfil comercial.",
  });
  assert.equal(repositoryCalled, false);
});

test("privacy settings service maps persisted state and propagates version conflicts", async () => {
  const service = createPrivacySettingsService({
    findPrivacySettings: async () => ({
      isPrivate: true,
      messagesPolicy: "circle",
      readReceipts: false,
      version: 3,
    }),
    savePrivacySettings: async () => null,
  });

  assert.deepEqual(await service.getPrivacySettings("account-id"), {
    profileVisibility: "private",
    messages: "circle",
    readReceipts: false,
    version: 3,
  });
  assert.equal(
    await service.updatePrivacySettings("account-id", {
      profileVisibility: "public",
      messages: "everyone",
      readReceipts: true,
      version: 3,
    }),
    null,
  );
});

test("owner profile updater delegates persistence and supplies the unchanged policy evaluator", async () => {
  let evaluated;
  const updateProfile = createOwnerProfileUpdater(
    async (accountId, patch, evaluate) => {
      evaluated = evaluate(
        {
          accountType: "personal",
          username: "person",
          firstName: "Ana",
          lastName: "Silva",
          displayName: "Ana Silva",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          publicNameChangedAt: null,
          usernameChangedAt: null,
          version: 1,
        },
        new Date("2026-01-02T00:00:00.000Z"),
      );
      assert.equal(accountId, "account-id");
      assert.equal(patch.version, 1);
      return { kind: "account_field_not_allowed" };
    },
  );

  const result = await updateProfile("account-id", {
    version: 1,
    displayName: "Outro nome",
  });
  assert.equal(result.kind, "account_field_not_allowed");
  assert.deepEqual(evaluated, {
    kind: "reject",
    result: { kind: "account_field_not_allowed" },
  });
});
