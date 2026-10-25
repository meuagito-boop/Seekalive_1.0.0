import assert from "node:assert/strict";
import { test } from "node:test";
import { registerRequestSchema } from "../../../shared/contracts/src/auth";
import { accountPatchSchema } from "../../../shared/contracts/src/social";

const personalRegistration = {
  accountType: "personal",
  firstName: "Ana",
  lastName: "Silva",
  username: "  Alice_42 ",
  email: "ana@example.com",
  password: "SenhaForte1!",
  passwordConfirmation: "SenhaForte1!",
  acceptedTermsVersion: "v1",
  age: 18,
};

test("registration and profile update normalize usernames consistently", () => {
  const registered = registerRequestSchema.parse(personalRegistration);
  const updated = accountPatchSchema.parse({ username: "  Alice_42 ", version: 1 });

  assert.equal(registered.username, "alice_42");
  assert.equal(updated.username, registered.username);
});

test("registration and profile update reject the same invalid username forms", () => {
  for (const username of ["ab", "name with spaces", "no-dashes", "name!"]) {
    assert.equal(
      registerRequestSchema.safeParse({ ...personalRegistration, username }).success,
      false,
      `registration should reject ${username}`,
    );
    assert.equal(
      accountPatchSchema.safeParse({ username, version: 1 }).success,
      false,
      `profile update should reject ${username}`,
    );
  }
});
