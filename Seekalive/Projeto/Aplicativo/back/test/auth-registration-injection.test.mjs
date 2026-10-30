import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createPersonalAccount } from "../src/modules/auth/application/registration/createPersonalAccount.ts";
import { createCommercialAccount } from "../src/modules/auth/application/registration/createCommercialAccount.ts";
import { createRegistrationAccount } from "../src/modules/auth/application/registration/createRegistrationAccount.ts";
import { createRegistrationAvailability } from "../src/modules/auth/application/registration/registrationAvailability.ts";
import { createRegistrationAccountCoordinator } from "../src/modules/auth/infrastructure/registrationAccountCoordinator.ts";
import { assessAccountAge } from "../src/modules/accounts/domain/accountAgeEligibility.ts";

const applicationDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/modules/auth/application/registration",
);
const identity = {
  username: "seek_user",
  email: "seek@example.com",
  passwordHash: "argon2-hash",
  acceptedTermsVersion: "v1",
};

test("registration application modules do not import database or infrastructure", async () => {
  const files = await readdir(applicationDirectory);
  for (const file of files.filter((name) => name.endsWith(".ts"))) {
    const source = await readFile(
      path.join(applicationDirectory, file),
      "utf8",
    );
    assert.doesNotMatch(
      source,
      /@workspace\/db|drizzle-orm|from\s*["'][^"']*\/infrastructure\//,
      `${file} must not import persistence or infrastructure.`,
    );
  }
});

test("personal registration maps trimmed names and account identity", () => {
  assert.deepEqual(
    createPersonalAccount(
      {
        accountType: "personal",
        firstName: "  Ana ",
        lastName: " Silva  ",
        age: 32,
      },
      identity,
    ),
    {
      ...identity,
      age: 32,
      accountType: "personal",
      displayName: "Ana Silva",
      firstName: "Ana",
      lastName: "Silva",
    },
  );
});

test("commercial registration maps establishment and location fields", () => {
  assert.deepEqual(
    createCommercialAccount(
      {
        accountType: "commercial",
        businessName: "  Café Central  ",
        age: 35,
        categoryKey: "cafe",
        discoveryKind: "place",
        address: "Rua Central, 10",
        postalCode: "01000-000",
        city: "São Paulo",
        state: "SP",
        country: "Brasil",
      },
      identity,
    ),
    {
      ...identity,
      age: 35,
      accountType: "commercial",
      displayName: "Café Central",
      firstName: null,
      lastName: null,
      commercialProfile: {
        categoryKey: "cafe",
        discoveryKind: "place",
        address: "Rua Central, 10",
        postalCode: "01000-000",
        cityName: "São Paulo",
        stateName: "SP",
        countryName: "Brasil",
      },
    },
  );
});

test("registration selects the account-specific mapper and writes once", async () => {
  const writes = [];
  const accountWriter = {
    async createPendingAccount(input) {
      writes.push(input);
      return {
        id: "pending-account",
        username: input.username,
        displayName: input.displayName,
      };
    },
  };
  const register = createRegistrationAccount(
    accountWriter,
    () => new Date("2026-10-29T12:00:00.000Z"),
  );
  const result = await register(
    {
      accountType: "commercial",
      businessName: "Mercado do Bairro",
      dateOfBirth: "01/01/1985",
      categoryKey: "market",
      discoveryKind: "place",
      address: "Rua A, 1",
      postalCode: "00000-000",
      city: "Santos",
      state: "SP",
      country: "Brasil",
    },
    identity,
  );

  assert.deepEqual(result, {
    kind: "created",
    account: {
      id: "pending-account",
      username: identity.username,
      displayName: "Mercado do Bairro",
    },
  });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].age, 41);
  assert.equal("dateOfBirth" in writes[0], false);
  assert.equal(writes[0].accountType, "commercial");
  assert.equal(writes[0].commercialProfile.cityName, "Santos");
});

test("registration calculates age on the server and blocks minors before persistence", async () => {
  const writes = [];
  const register = createRegistrationAccount(
    {
      async createPendingAccount(input) {
        writes.push(input);
        return null;
      },
    },
    () => new Date("2026-10-29T12:00:00.000Z"),
  );

  const result = await register(
    {
      accountType: "personal",
      firstName: "Ana",
      lastName: "Silva",
      dateOfBirth: "30/10/2008",
      username: "ana_silva",
      email: "ana@example.com",
      password: "Strong!123",
      passwordConfirmation: "Strong!123",
      acceptedTermsVersion: "v1",
    },
    identity,
  );

  assert.deepEqual(result, { kind: "age_ineligible", reason: "underage" });
  assert.equal(writes.length, 0);
});

test("account age policy validates calendar dates and exact birthdays", () => {
  const today = new Date("2026-10-29T12:00:00.000Z");

  assert.deepEqual(assessAccountAge("29/10/2008", today), {
    kind: "eligible",
    age: 18,
  });
  assert.deepEqual(assessAccountAge("30/10/2008", today), {
    kind: "ineligible",
    reason: "underage",
  });
  assert.deepEqual(assessAccountAge("31/02/2000", today), {
    kind: "ineligible",
    reason: "invalid_date",
  });
  assert.deepEqual(assessAccountAge("30/10/2026", today), {
    kind: "ineligible",
    reason: "invalid_date",
  });
});

test("registration coordinator delegates each write to its owning module", async () => {
  const calls = [];
  const transaction = { transactionId: "shared-dev-transaction" };
  const coordinator = createRegistrationAccountCoordinator({
    async runInTransaction(work) {
      calls.push(["transaction"]);
      return work(transaction);
    },
    async createPendingAccountIdentity(receivedTransaction, input) {
      calls.push(["accounts", receivedTransaction, input]);
      return {
        id: "created-account",
        username: input.username,
        displayName: input.displayName,
      };
    },
    async createInitialPasswordCredential(
      receivedTransaction,
      accountId,
      hash,
    ) {
      calls.push(["security", receivedTransaction, accountId, hash]);
    },
    async initializeCommercialProfile(receivedTransaction, accountId, profile) {
      calls.push(["profiles", receivedTransaction, accountId, profile]);
    },
  });

  const created = await coordinator.createPendingAccount({
    accountType: "commercial",
    username: identity.username,
    email: identity.email,
    passwordHash: identity.passwordHash,
    acceptedTermsVersion: identity.acceptedTermsVersion,
    age: 41,
    displayName: "Mercado do Bairro",
    firstName: null,
    lastName: null,
    commercialProfile: {
      categoryKey: "market",
      discoveryKind: "place",
      address: "Rua A, 1",
      postalCode: "00000-000",
      cityName: "Santos",
      stateName: "SP",
      countryName: "Brasil",
    },
  });

  assert.deepEqual(created, {
    id: "created-account",
    username: identity.username,
    displayName: "Mercado do Bairro",
  });
  assert.deepEqual(
    calls.map(([owner]) => owner),
    ["transaction", "accounts", "security", "profiles"],
  );
  assert.deepEqual(calls[1][2], {
    username: identity.username,
    email: identity.email,
    age: 41,
    acceptedTermsVersion: identity.acceptedTermsVersion,
    displayName: "Mercado do Bairro",
    accountType: "commercial",
    firstName: null,
    lastName: null,
  });
  assert.equal(calls[2][1], transaction);
  assert.equal(calls[3][1], transaction);
});

test("personal registration skips commercial profile persistence", async () => {
  const calls = [];
  const coordinator = createRegistrationAccountCoordinator({
    async runInTransaction(work) {
      return work({});
    },
    async createPendingAccountIdentity(_transaction, input) {
      calls.push(["accounts", input]);
      return {
        id: "personal-account",
        username: input.username,
        displayName: input.displayName,
      };
    },
    async createInitialPasswordCredential(_transaction, accountId) {
      calls.push(["security", accountId]);
    },
    async initializeCommercialProfile() {
      calls.push(["profiles"]);
    },
  });

  await coordinator.createPendingAccount({
    accountType: "personal",
    username: identity.username,
    email: identity.email,
    passwordHash: identity.passwordHash,
    acceptedTermsVersion: identity.acceptedTermsVersion,
    age: 32,
    displayName: "Ana Silva",
    firstName: "Ana",
    lastName: "Silva",
  });

  assert.deepEqual(
    calls.map(([owner]) => owner),
    ["accounts", "security"],
  );
});

test("registration coordinator does not create credentials when username is unavailable", async () => {
  const calls = [];
  const coordinator = createRegistrationAccountCoordinator({
    async runInTransaction(work) {
      return work({});
    },
    async createPendingAccountIdentity() {
      calls.push("accounts");
      return null;
    },
    async createInitialPasswordCredential() {
      calls.push("security");
    },
    async initializeCommercialProfile() {
      calls.push("profiles");
    },
  });

  const result = await coordinator.createPendingAccount({
    accountType: "personal",
    username: identity.username,
    email: identity.email,
    passwordHash: identity.passwordHash,
    acceptedTermsVersion: identity.acceptedTermsVersion,
    age: 32,
    displayName: "Ana Silva",
    firstName: "Ana",
    lastName: "Silva",
  });

  assert.equal(result, null);
  assert.deepEqual(calls, ["accounts"]);
});

test("registration coordinator propagates domain writer failures to transaction runner", async () => {
  const expectedError = new Error("credential persistence failed");
  const coordinator = createRegistrationAccountCoordinator({
    async runInTransaction(work) {
      return work({});
    },
    async createPendingAccountIdentity(_transaction, input) {
      return {
        id: "created-account",
        username: input.username,
        displayName: input.displayName,
      };
    },
    async createInitialPasswordCredential() {
      throw expectedError;
    },
    async initializeCommercialProfile() {
      assert.fail(
        "Profile initialization must not run after credential failure.",
      );
    },
  });

  await assert.rejects(
    coordinator.createPendingAccount({
      accountType: "personal",
      username: identity.username,
      email: identity.email,
      passwordHash: identity.passwordHash,
      acceptedTermsVersion: identity.acceptedTermsVersion,
      age: 32,
      displayName: "Ana Silva",
      firstName: "Ana",
      lastName: "Silva",
    }),
    (error) => error === expectedError,
  );
});

test("username availability checks accounts before active reservations", async () => {
  const calls = [];
  const availability = createRegistrationAvailability({
    async accountExistsByUsername(username) {
      calls.push(["account", username]);
      return false;
    },
    async activeUsernameReservationExists(username, at) {
      calls.push(["reservation", username, at]);
      return true;
    },
    async findAccountByEmail() {
      return null;
    },
  });

  assert.equal(
    await availability.isRegistrationUsernameUnavailable("taken_user"),
    true,
  );
  assert.deepEqual(
    calls.map(([kind, username]) => [kind, username]),
    [
      ["account", "taken_user"],
      ["reservation", "taken_user"],
    ],
  );
  assert.ok(calls[1][2] instanceof Date);
});

test("existing username short-circuits reservation lookup", async () => {
  const calls = [];
  const availability = createRegistrationAvailability({
    async accountExistsByUsername() {
      calls.push("account");
      return true;
    },
    async activeUsernameReservationExists() {
      calls.push("reservation");
      return false;
    },
    async findAccountByEmail() {
      return null;
    },
  });

  assert.equal(
    await availability.isRegistrationUsernameUnavailable("existing_user"),
    true,
  );
  assert.deepEqual(calls, ["account"]);
});

test("email lookup preserves the registration verification account contract", async () => {
  const expected = {
    id: "pending-account",
    displayName: "Ana Silva",
    status: "pending_verification",
  };
  const availability = createRegistrationAvailability({
    async accountExistsByUsername() {
      return false;
    },
    async activeUsernameReservationExists() {
      return false;
    },
    async findAccountByEmail(email) {
      assert.equal(email, "ana@example.com");
      return expected;
    },
  });

  assert.equal(
    await availability.findRegistrationEmail("ana@example.com"),
    expected,
  );
});
