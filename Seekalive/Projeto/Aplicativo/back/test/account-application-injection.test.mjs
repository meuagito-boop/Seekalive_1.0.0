import assert from "node:assert/strict";
import test from "node:test";
import { createAccountViews } from "../src/modules/accounts/application/accountViews.ts";

const relationship = {
  following: "none",
  inCircle: false,
  blockedByMe: false,
  blockedByThem: false,
  mutedByMe: false,
};

const stats = { posts: 3, followers: 4, following: 5, circles: 1 };

function accountRow(id) {
  return {
    id,
    username: id,
    displayName: `Display ${id}`,
    bio: `Bio ${id}`,
    locationLabel: null,
    websiteUrl: null,
    accountType: "personal",
    isPrivate: false,
    createdAt: new Date("2026-10-27T00:00:00.000Z"),
    version: 1,
  };
}

test("account view batching keeps input order and delegates to injected ports", async () => {
  const calls = [];
  const accounts = createAccountViews(
    {
      async findActiveAccountById() {
        return null;
      },
      async findActiveAccountByUsername() {
        return null;
      },
      async findActiveAccountsByIds(ids) {
        calls.push(["read", ids]);
        return [accountRow("b"), accountRow("a")];
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

  const views = await accounts.accountViewsByIds(["a", "b", "a"], "viewer");

  assert.deepEqual(calls, [
    ["read", ["a", "b"]],
    ["social", ["b", "a"], "viewer", {}],
  ]);
  assert.deepEqual(views.map((view) => view.id), ["a", "b", "a"]);
  assert.equal(views[0].stats.posts, 3);
});

test("account view batching returns early for an empty request", async () => {
  let calls = 0;
  const accounts = createAccountViews(
    {
      async findActiveAccountById() { calls += 1; return null; },
      async findActiveAccountByUsername() { calls += 1; return null; },
      async findActiveAccountsByIds() { calls += 1; return []; },
    },
    {
      async getRelationshipFor() { calls += 1; return relationship; },
      async getAccountSocialStats() { calls += 1; return stats; },
      async getAccountSocialSummariesByIds() { calls += 1; return new Map(); },
    },
  );

  assert.deepEqual(await accounts.accountViewsByIds([], null), []);
  assert.equal(calls, 0);
});
