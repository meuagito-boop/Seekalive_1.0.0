import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareCommercialProfileUpdate } from "../src/modules/profiles/application/commercialProfileUpdate.ts";
import { preparePersonalProfileUpdate } from "../src/modules/profiles/application/personalProfileUpdate.ts";

const personalOwner = {
  accountType: "personal",
  username: "person",
  firstName: "Ana",
  lastName: "Silva",
  displayName: "Ana Silva",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  publicNameChangedAt: null,
  usernameChangedAt: null,
  version: 1,
};

const commercialOwner = {
  ...personalOwner,
  accountType: "commercial",
  firstName: null,
  lastName: null,
  displayName: "Café Central",
};

test("personal profile update derives display name from the first and last name", () => {
  const result = preparePersonalProfileUpdate(personalOwner, {
    version: 1,
    firstName: "Maria",
    lastName: "Souza",
    displayName: "Maria Souza",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.changes, {
    publicNameChanged: true,
    profileFields: {
      firstName: "Maria",
      lastName: "Souza",
      displayName: "Maria Souza",
    },
  });
});

test("commercial profile update accepts the establishment name without personal names", () => {
  const result = prepareCommercialProfileUpdate(commercialOwner, {
    version: 1,
    displayName: "Café do Centro",
  });

  assert.equal(result.ok, true);
  assert.equal(result.changes.publicNameChanged, true);
  assert.deepEqual(result.changes.profileFields, { displayName: "Café do Centro" });
});

test("personal profile update rejects a display name that conflicts with the submitted names", () => {
  const result = preparePersonalProfileUpdate(personalOwner, {
    version: 1,
    firstName: "Maria",
    lastName: "Souza",
    displayName: "Outro Nome",
  });

  assert.deepEqual(result, { ok: false, kind: "account_name_mismatch" });
});
