import assert from "node:assert/strict";
import test from "node:test";
import { createGetAccountSocialStats } from "../src/modules/social/application/getAccountSocialStats.ts";
import { createGetRelationshipFor } from "../src/modules/social/application/getRelationshipFor.ts";
import { createFollowAccount } from "../src/modules/social/application/followAccount.ts";
import { createResolveRelationshipListTarget } from "../src/modules/social/application/resolveRelationshipListTarget.ts";

test("follow use case delegates to its injected relationship port", async () => {
  const calls = [];
  const followAccount = createFollowAccount({
    async follow(actorId, targetId) {
      calls.push([actorId, targetId]);
      return { status: "accepted", updatedAt: "2026-10-27T00:00:00.000Z" };
    },
  });

  const result = await followAccount("actor", "target");

  assert.deepEqual(result, { status: "accepted", updatedAt: "2026-10-27T00:00:00.000Z" });
  assert.deepEqual(calls, [["actor", "target"]]);
});

test("relationship use case skips reads for anonymous and self views", async () => {
  let reads = 0;
  const getRelationshipFor = createGetRelationshipFor({
    async readRelationshipState() {
      reads += 1;
      throw new Error("unexpected repository call");
    },
  });

  const anonymous = await getRelationshipFor(null, "target");
  const self = await getRelationshipFor("target", "target");

  assert.equal(anonymous.following, "none");
  assert.equal(self.inCircle, false);
  assert.equal(reads, 0);
});

test("social stats use injected relationship and Feed post-count ports", async () => {
  const called = [];
  const getAccountSocialStats = createGetAccountSocialStats(
    {
      async readAccountSocialStats(accountId) {
        called.push(["social", accountId]);
        return { followers: 4, following: 2, circles: 1 };
      },
    },
    {
      async countAllPostsByAuthorIds(accountIds) {
        called.push(["feed", accountIds]);
        return new Map([[accountIds[0], 7]]);
      },
    },
  );

  assert.deepEqual(await getAccountSocialStats("author"), {
    posts: 7,
    followers: 4,
    following: 2,
    circles: 1,
  });
  assert.deepEqual(called, [["social", "author"], ["feed", ["author"]]]);
});

test("relationship-list access policy uses injected account and relationship readers", async () => {
  const resolve = createResolveRelationshipListTarget({
    async findActiveAccountById(accountId) {
      return { id: accountId, isPrivate: true };
    },
    async getRelationshipFor() {
      return {
        following: "accepted",
        inCircle: false,
        blockedByMe: false,
        blockedByThem: false,
        mutedByMe: false,
      };
    },
  });

  assert.deepEqual(await resolve("viewer", "target"), {
    kind: "visible",
    viewerId: "viewer",
  });
});
