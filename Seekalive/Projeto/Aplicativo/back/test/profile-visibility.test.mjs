import assert from "node:assert/strict";
import { test } from "node:test";
import { canViewPrivateProfileContent } from "../src/modules/profiles/application/profileVisibility.ts";

test("public profiles remain visible to signed-out visitors", () => {
  assert.equal(canViewPrivateProfileContent(false, null, "account", "none"), true);
});

test("private profile visibility is limited to the owner and accepted followers", () => {
  assert.equal(canViewPrivateProfileContent(true, null, "account", "none"), false);
  assert.equal(canViewPrivateProfileContent(true, "account", "account", "none"), true);
  assert.equal(canViewPrivateProfileContent(true, "follower", "account", "accepted"), true);
  assert.equal(canViewPrivateProfileContent(true, "requester", "account", "pending"), false);
});
