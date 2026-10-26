import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAccountView } from "../src/modules/accounts/application/accountViewMapper.ts";
import { canViewPrivateProfileContent } from "../src/modules/accounts/domain/accountVisibility.ts";

const account = {
  id: "account",
  username: "test_user",
  displayName: "Test User",
  bio: "Private biography",
  locationLabel: "São Paulo",
  websiteUrl: "https://example.test",
  accountType: "personal",
  isPrivate: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  version: 1,
};

const relationship = {
  following: "none",
  inCircle: false,
  blockedByMe: false,
  blockedByThem: false,
  mutedByMe: false,
};

const stats = {
  posts: 2,
  followers: 3,
  following: 4,
  circles: 1,
};

test("public profiles remain visible to signed-out visitors", () => {
  assert.equal(canViewPrivateProfileContent(false, null, "account", "none"), true);
});

test("private profile visibility is limited to the owner and accepted followers", () => {
  assert.equal(canViewPrivateProfileContent(true, null, "account", "none"), false);
  assert.equal(canViewPrivateProfileContent(true, "account", "account", "none"), true);
  assert.equal(canViewPrivateProfileContent(true, "follower", "account", "accepted"), true);
  assert.equal(canViewPrivateProfileContent(true, "requester", "account", "pending"), false);
});

test("account view mapper redacts private profile details from non-followers", () => {
  const view = buildAccountView(account, null, relationship, stats);

  assert.equal(view.bio, "");
  assert.equal(view.location, null);
  assert.equal(view.website, null);
  assert.equal(view.joinedAt, "2026-01-01T00:00:00.000Z");
  assert.deepEqual(view.stats, stats);
});

test("account view mapper shows private profile details to the owner", () => {
  const view = buildAccountView(account, "account", relationship, stats);

  assert.equal(view.bio, "Private biography");
  assert.equal(view.location, "São Paulo");
  assert.equal(view.website, "https://example.test");
});
