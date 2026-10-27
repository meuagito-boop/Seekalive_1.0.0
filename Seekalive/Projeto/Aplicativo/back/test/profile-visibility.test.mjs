import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAccountView } from "../src/modules/accounts/application/accountViewMapper.ts";
import { canViewPrivateProfileContent } from "../src/modules/accounts/domain/accountVisibility.ts";
import { getPublicProfileByUsername } from "../src/modules/profiles/application/publicProfile.ts";

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

test("public profile composition hides a blocked profile before loading its content", async () => {
  let contentWasLoaded = false;
  const result = await getPublicProfileByUsername("blocked_user", "viewer", {
    accountView: async () => ({}),
    findActiveAccountById: async () => null,
    findActiveAccountByUsername: async () => ({ ...account, id: "blocked-account" }),
    getRelationshipFor: async () => relationship,
    isBlockedBetween: async () => true,
    listProfilePosts: async () => {
      contentWasLoaded = true;
      return { items: [], nextCursor: null };
    },
  });

  assert.deepEqual(result, { kind: "not_found" });
  assert.equal(contentWasLoaded, false);
});

test("public profile composition delegates private-content access to the visibility policy", async () => {
  const result = await getPublicProfileByUsername("private_user", null, {
    accountView: async () => ({ id: "account" }),
    findActiveAccountById: async () => null,
    findActiveAccountByUsername: async () => ({ ...account, id: "account" }),
    getRelationshipFor: async () => relationship,
    isBlockedBetween: async () => false,
    listProfilePosts: async () => ({ items: [], nextCursor: null }),
  });

  assert.equal(result.kind, "found");
  assert.equal(result.data.visibility.canViewPublicContent, false);
  assert.equal(result.data.visibility.canViewCircleContent, false);
});
