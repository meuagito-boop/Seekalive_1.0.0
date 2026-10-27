import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createPersonalAccount } from "../src/modules/auth/application/registration/createPersonalAccount.ts";
import { createCommercialAccount } from "../src/modules/auth/application/registration/createCommercialAccount.ts";
import { createRegistrationAccount } from "../src/modules/auth/application/registration/createRegistrationAccount.ts";
import { createRegistrationAvailability } from "../src/modules/auth/application/registration/registrationAvailability.ts";

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
  const register = createRegistrationAccount(accountWriter);
  const created = await register(
    {
      accountType: "commercial",
      businessName: "Mercado do Bairro",
      age: 41,
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

  assert.deepEqual(created, {
    id: "pending-account",
    username: identity.username,
    displayName: "Mercado do Bairro",
  });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].accountType, "commercial");
  assert.equal(writes[0].commercialProfile.cityName, "Santos");
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
