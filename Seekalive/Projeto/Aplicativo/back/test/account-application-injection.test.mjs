import assert from "node:assert/strict";
import test from "node:test";
import { createProfileViews } from "../src/modules/profiles/application/profileViews.ts";

const relationship = {
  following: "none",
  inCircle: false,
  blockedByMe: false,
  blockedByThem: false,
  mutedByMe: false,
};

const stats = { posts: 3, followers: 4, following: 5, circles: 1 };

function accountIdentity(id) {
  return {
    id,
    username: id,
    accountType: "personal",
    createdAt: new Date("2026-10-27T00:00:00.000Z"),
    version: 1,
  };
}

function profileRecord(id) {
  return {
    accountId: id,
    firstName: null,
    lastName: null,
    displayName: `Display ${id}`,
    bio: `Bio ${id}`,
    locationLabel: null,
    websiteUrl: null,
    isPrivate: false,
  };
}

test("profile view batching keeps input order and delegates to domain ports", async () => {
  const calls = [];
  const profiles = createProfileViews(
    {
      async findActiveAccountById() {
        return null;
      },
      async findActiveAccountByUsername() {
        return null;
      },
      async findActiveAccountsByIds(ids) {
        calls.push(["read", ids]);
        return [accountIdentity("b"), accountIdentity("a")];
      },
    },
    {
      async findByAccountId() {
        throw new Error("single profile lookup is not expected in batch mode");
      },
      async findByAccountIds(ids) {
        calls.push(["profiles", ids]);
        return new Map(ids.map((id) => [id, profileRecord(id)]));
      },
    },
    {
      async getRelationshipFor() {
        throw new Error("single relationship lookup is not expected in batch mode");
      },
      async getAccountSocialStats() {
        throw new Error("single stats lookup is not expected in batch mode");
      },
      async getAccountSocialSummariesByIds(ids, viewerId, options) {
        calls.push(["social", ids, viewerId, options]);
        return new Map(ids.map((id) => [id, { relationship, stats }]));
      },
    },
  );

  const views = await profiles.accountViewsByIds(["a", "b", "a"], "viewer");

  assert.deepEqual(calls, [
    ["read", ["a", "b"]],
    ["profiles", ["b", "a"]],
    ["social", ["b", "a"], "viewer", {}],
  ]);
  assert.deepEqual(views.map((view) => view.id), ["a", "b", "a"]);
  assert.equal(views[0].stats.posts, 3);
});

test("profile view batching returns early for an empty request", async () => {
  let calls = 0;
  const profiles = createProfileViews(
    {
      async findActiveAccountById() { calls += 1; return null; },
      async findActiveAccountByUsername() { calls += 1; return null; },
      async findActiveAccountsByIds() { calls += 1; return []; },
    },
    {
      async findByAccountId() { calls += 1; return null; },
      async findByAccountIds() { calls += 1; return new Map(); },
    },
    {
      async getRelationshipFor() { calls += 1; return relationship; },
      async getAccountSocialStats() { calls += 1; return stats; },
      async getAccountSocialSummariesByIds() { calls += 1; return new Map(); },
    },
  );

  assert.deepEqual(await profiles.accountViewsByIds([], null), []);
  assert.equal(calls, 0);
});
