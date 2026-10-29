import assert from "node:assert/strict";
import { test } from "node:test";
import { registerRequestSchema } from "../../../shared/contracts/src/auth";
import {
  accountPatchSchema,
  profileUsernameParamSchema,
} from "../../../shared/contracts/src/social";

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
  const updated = accountPatchSchema.parse({
    username: "  Alice_42 ",
    version: 1,
  });

  assert.equal(registered.username, "alice_42");
  assert.equal(updated.username, registered.username);
});

test("registration and profile update reject the same invalid username forms", () => {
  for (const username of ["ab", "name with spaces", "no.dots", "Ána_1"]) {
    assert.equal(
      registerRequestSchema.safeParse({ ...personalRegistration, username })
        .success,
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

test("reserved Seekalive handles cannot be claimed but remain addressable", () => {
  const reservedUsernames = [
    "seekalive",
    "SeekAlive",
    "seek-alive",
    "seek_alive",
    "official_seekalive",
    "seekalive_support",
    "s-e-e-k-a-l-i-v-e",
    "s33k4l1v3",
    "012_seekalive_7",
  ];

  for (const username of reservedUsernames) {
    assert.equal(
      registerRequestSchema.safeParse({
        ...personalRegistration,
        username,
      }).success,
      false,
      `registration should reserve ${username}`,
    );
    assert.equal(
      accountPatchSchema.safeParse({ username, version: 1 }).success,
      false,
      `profile update should reserve ${username}`,
    );
    assert.equal(
      profileUsernameParamSchema.safeParse({ username }).success,
      true,
      `public system profile lookup should accept ${username}`,
    );
  }
});
