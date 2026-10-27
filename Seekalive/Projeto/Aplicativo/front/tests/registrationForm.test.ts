import assert from "node:assert/strict";
import test from "node:test";
import { registrationFormSchema } from "../src/modules/auth/application/registrationFormSchema";
import { toRegistrationPayload } from "../src/modules/auth/application/registrationPayload";

const personalForm = {
  accountType: "personal" as const,
  firstName: "Ana",
  lastName: "Silva",
  businessName: "",
  age: "24",
  businessCategory: "",
  discoveryKind: "place" as const,
  address: "",
  postalCode: "",
  city: "",
  state: "",
  country: "Brasil",
  username: "ana_silva",
  email: "ANA@EXAMPLE.COM",
  password: "Strong!123",
  confirmPassword: "Strong!123",
  terms: true,
};

test("personal signup validates minimum age, identity and matching passwords", () => {
  assert.equal(registrationFormSchema.safeParse(personalForm).success, true);
  assert.equal(
    registrationFormSchema.safeParse({ ...personalForm, age: "17" }).success,
    false,
  );
  assert.equal(
    registrationFormSchema.safeParse({
      ...personalForm,
      confirmPassword: "Different!123",
    }).success,
    false,
  );
});

test("personal registration payload normalizes email and trims username", () => {
  const result = registrationFormSchema.safeParse({
    ...personalForm,
    username: " ana_silva ",
  });
  assert.equal(result.success, true);
  if (!result.success) return;

  assert.deepEqual(toRegistrationPayload(result.data), {
    accountType: "personal",
    firstName: "Ana",
    lastName: "Silva",
    age: 24,
    username: "ana_silva",
    email: "ana@example.com",
    password: "Strong!123",
    passwordConfirmation: "Strong!123",
    acceptedTermsVersion: "v1",
  });
});

test("commercial signup requires its category and address and maps its own profile data", () => {
  const commercial = {
    ...personalForm,
    accountType: "commercial" as const,
    firstName: "",
    lastName: "",
    businessName: "Café Central",
    businessCategory: "cafes",
    discoveryKind: "place" as const,
    address: "Rua Augusta, 210",
    postalCode: "01305-000",
    city: "São Paulo",
    state: "SP",
    country: "Brasil",
  };

  assert.equal(registrationFormSchema.safeParse(commercial).success, true);
  assert.equal(
    registrationFormSchema.safeParse({
      ...commercial,
      businessCategory: "",
    }).success,
    false,
  );

  const payload = toRegistrationPayload(commercial);
  assert.equal(payload.accountType, "commercial");
  if (payload.accountType !== "commercial") {
    assert.fail("expected a commercial registration payload");
  }
  assert.deepEqual(
    {
      businessName: payload.businessName,
      categoryKey: payload.categoryKey,
      discoveryKind: payload.discoveryKind,
      address: payload.address,
      postalCode: payload.postalCode,
      city: payload.city,
      state: payload.state,
      country: payload.country,
    },
    {
      businessName: "Café Central",
      categoryKey: "cafes",
      discoveryKind: "place",
      address: "Rua Augusta, 210",
      postalCode: "01305-000",
      city: "São Paulo",
      state: "SP",
      country: "Brasil",
    },
  );
});
