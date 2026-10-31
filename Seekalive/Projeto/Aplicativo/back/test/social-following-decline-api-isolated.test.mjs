import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  assertApiError,
  startIsolatedHttpApiHarness,
} from "./support/isolatedHttpApiHarness.mjs";

let harness;

before(async () => {
  harness = await startIsolatedHttpApiHarness({
    sessionSecret: "seekalive-social-following-decline-isolated-secret",
    requiredTables: [
      "accountFollowRequests",
      "accountFollows",
      "accountBlocks",
      "accountProfiles",
    ],
  });
});

after(async () => {
  await harness?.close();
});

test("following list and follow-request decline work over isolated HTTP", async () => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
  const owner = await harness.createVerifiedAccount("personal", `o${suffix}`);
  const followedOne = await harness.createVerifiedAccount(
    "personal",
    `a${suffix}`,
  );
  const followedTwo = await harness.createVerifiedAccount(
    "personal",
    `b${suffix}`,
  );
  const requester = await harness.createVerifiedAccount(
    "personal",
    `r${suffix}`,
  );

  for (const target of [followedOne, followedTwo]) {
    const follow = await harness.request(
      `/api/v1/social/accounts/${target.account.id}/follow`,
      { method: "PUT", auth: owner.auth },
    );
    assert.equal(follow.response.status, 200, JSON.stringify(follow.body));
    assert.equal(follow.body.status, "accepted");
  }

  const followingPath = `/api/v1/social/accounts/${owner.account.id}/following`;
  const firstPage = await harness.request(`${followingPath}?limit=1`);
  assert.equal(firstPage.response.status, 200, JSON.stringify(firstPage.body));
  assert.equal(firstPage.body.items.length, 1);
  assert.ok(firstPage.body.nextCursor);

  const secondPage = await harness.request(
    `${followingPath}?limit=1&cursor=${encodeURIComponent(firstPage.body.nextCursor)}`,
  );
  assert.equal(
    secondPage.response.status,
    200,
    JSON.stringify(secondPage.body),
  );
  assert.equal(secondPage.body.items.length, 1);
  assert.equal(secondPage.body.nextCursor, null);
  assert.notEqual(firstPage.body.items[0].id, secondPage.body.items[0].id);
  assert.deepEqual(
    new Set([firstPage.body.items[0].id, secondPage.body.items[0].id]),
    new Set([followedOne.account.id, followedTwo.account.id]),
  );

  const invalidLimit = await harness.request(`${followingPath}?limit=0`);
  assertApiError(invalidLimit, 400, "VALIDATION_ERROR");
  const invalidCursor = await harness.request(
    `${followingPath}?cursor=not-a-cursor`,
  );
  assertApiError(invalidCursor, 400, "VALIDATION_ERROR");

  const missingAccount = await harness.request(
    `/api/v1/social/accounts/00000000-0000-4000-8000-000000000000/following`,
  );
  assertApiError(missingAccount, 404, "ACCOUNT_NOT_FOUND");

  const privacyBefore = await harness.request("/api/v1/accounts/me/privacy", {
    auth: owner.auth,
  });
  assert.equal(
    privacyBefore.response.status,
    200,
    JSON.stringify(privacyBefore.body),
  );
  const privacyUpdate = await harness.request("/api/v1/accounts/me/privacy", {
    method: "PUT",
    auth: owner.auth,
    body: {
      profileVisibility: "private",
      messages: privacyBefore.body.messages,
      readReceipts: privacyBefore.body.readReceipts,
      version: privacyBefore.body.version,
    },
  });
  assert.equal(
    privacyUpdate.response.status,
    200,
    JSON.stringify(privacyUpdate.body),
  );
  assert.equal(privacyUpdate.body.profileVisibility, "private");

  const privateFollowing = await harness.request(followingPath, {
    auth: requester.auth,
  });
  assertApiError(privateFollowing, 403, "PRIVATE_PROFILE");

  const privateFollow = await harness.request(
    `/api/v1/social/accounts/${owner.account.id}/follow`,
    { method: "PUT", auth: requester.auth },
  );
  assert.equal(
    privateFollow.response.status,
    200,
    JSON.stringify(privateFollow.body),
  );
  assert.equal(privateFollow.body.status, "pending");

  const pendingBeforeDecline = await harness.request(
    "/api/v1/social/follow-requests",
    { auth: owner.auth },
  );
  assert.equal(
    pendingBeforeDecline.response.status,
    200,
    JSON.stringify(pendingBeforeDecline.body),
  );
  assert.ok(
    pendingBeforeDecline.body.items.some(
      (item) => item.account.id === requester.account.id,
    ),
  );

  const declinePath = `/api/v1/social/follow-requests/${requester.account.id}/decline`;
  const unauthenticatedDecline = await harness.request(declinePath, {
    method: "POST",
  });
  assertApiError(unauthenticatedDecline, 403, "CSRF_REJECTED");

  const preAuth = await harness.createPreAuth();
  const preAuthWithoutAccount = await harness.request(declinePath, {
    method: "POST",
    auth: preAuth,
  });
  assertApiError(preAuthWithoutAccount, 401, "UNAUTHENTICATED");

  const authenticatedWithoutCsrf = await harness.request(declinePath, {
    method: "POST",
    auth: { cookie: owner.auth.cookie },
  });
  assertApiError(authenticatedWithoutCsrf, 403, "CSRF_REJECTED");

  const declined = await harness.request(declinePath, {
    method: "POST",
    auth: owner.auth,
  });
  assert.equal(declined.response.status, 204);
  assert.equal(declined.body, null);

  const pendingAfterDecline = await harness.request(
    "/api/v1/social/follow-requests",
    { auth: owner.auth },
  );
  assert.equal(
    pendingAfterDecline.response.status,
    200,
    JSON.stringify(pendingAfterDecline.body),
  );
  assert.deepEqual(pendingAfterDecline.body.items, []);

  const { accountFollowRequests, accountFollows, db } = harness.database;
  const pendingRows = await db
    .select()
    .from(accountFollowRequests)
    .where(
      and(
        eq(accountFollowRequests.requesterId, requester.account.id),
        eq(accountFollowRequests.targetId, owner.account.id),
      ),
    );
  assert.deepEqual(pendingRows, []);

  const followRows = await db
    .select()
    .from(accountFollows)
    .where(
      and(
        eq(accountFollows.followerId, requester.account.id),
        eq(accountFollows.followedId, owner.account.id),
      ),
    );
  assert.deepEqual(followRows, []);
});

test("follow, unfollow, and block mutations enforce relationship state over isolated HTTP", async () => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
  const actor = await harness.createVerifiedAccount(
    "personal",
    `x${suffix}`,
    "198.51.100.101",
  );
  const target = await harness.createVerifiedAccount(
    "personal",
    `y${suffix}`,
    "198.51.100.102",
  );
  const unrelated = await harness.createVerifiedAccount(
    "personal",
    `z${suffix}`,
    "198.51.100.103",
  );
  const { accountBlocks, accountFollows, db } = harness.database;
  const followPath = `/api/v1/social/accounts/${target.account.id}/follow`;

  const anonymousBlockList = await harness.request("/api/v1/social/blocks");
  assertApiError(anonymousBlockList, 401, "UNAUTHENTICATED");
  const missingCsrfBlock = await harness.request(
    `/api/v1/social/blocks/${target.account.id}`,
    { method: "PUT", auth: { cookie: actor.auth.cookie } },
  );
  assertApiError(missingCsrfBlock, 403, "CSRF_REJECTED");

  const selfFollow = await harness.request(
    `/api/v1/social/accounts/${actor.account.id}/follow`,
    { method: "PUT", auth: actor.auth },
  );
  assertApiError(selfFollow, 400, "INVALID_RELATIONSHIP");
  const malformedFollow = await harness.request(
    "/api/v1/social/accounts/not-a-uuid/follow",
    { method: "PUT", auth: actor.auth },
  );
  assertApiError(malformedFollow, 404, "ACCOUNT_NOT_FOUND");
  const missingTargetFollow = await harness.request(
    "/api/v1/social/accounts/00000000-0000-4000-8000-000000000000/follow",
    { method: "PUT", auth: actor.auth },
  );
  assertApiError(missingTargetFollow, 404, "ACCOUNT_NOT_FOUND");

  const followed = await harness.request(followPath, {
    method: "PUT",
    auth: actor.auth,
  });
  assert.equal(followed.response.status, 200, JSON.stringify(followed.body));
  assert.equal(followed.body.status, "accepted");
  const repeatedFollow = await harness.request(followPath, {
    method: "PUT",
    auth: actor.auth,
  });
  assert.equal(
    repeatedFollow.response.status,
    200,
    JSON.stringify(repeatedFollow.body),
  );
  assert.equal(repeatedFollow.body.status, "accepted");
  assert.equal(repeatedFollow.body.updatedAt, followed.body.updatedAt);

  const reciprocalFollow = await harness.request(
    `/api/v1/social/accounts/${actor.account.id}/follow`,
    { method: "PUT", auth: target.auth },
  );
  assert.equal(
    reciprocalFollow.response.status,
    200,
    JSON.stringify(reciprocalFollow.body),
  );

  const blocked = await harness.request(
    `/api/v1/social/blocks/${target.account.id}`,
    { method: "PUT", auth: actor.auth },
  );
  assert.equal(blocked.response.status, 204);
  const repeatedBlock = await harness.request(
    `/api/v1/social/blocks/${target.account.id}`,
    { method: "PUT", auth: actor.auth },
  );
  assert.equal(repeatedBlock.response.status, 204);

  const actorBlocks = await harness.request("/api/v1/social/blocks", {
    auth: actor.auth,
  });
  assert.ok(
    actorBlocks.body.items.some((item) => item.id === target.account.id),
  );
  const unrelatedBlocks = await harness.request("/api/v1/social/blocks", {
    auth: unrelated.auth,
  });
  assert.ok(
    !unrelatedBlocks.body.items.some((item) => item.id === target.account.id),
  );

  const otherAccountUnblock = await harness.request(
    `/api/v1/social/blocks/${target.account.id}`,
    { method: "DELETE", auth: unrelated.auth },
  );
  assert.equal(otherAccountUnblock.response.status, 204);
  const blockAfterUnrelatedUnblock = await harness.request(
    "/api/v1/social/blocks",
    { auth: actor.auth },
  );
  assert.ok(
    blockAfterUnrelatedUnblock.body.items.some(
      (item) => item.id === target.account.id,
    ),
  );

  const followBlockedActor = await harness.request(
    `/api/v1/social/accounts/${actor.account.id}/follow`,
    { method: "PUT", auth: target.auth },
  );
  assertApiError(followBlockedActor, 404, "ACCOUNT_NOT_FOUND");
  const hiddenBlockedList = await harness.request(
    `/api/v1/social/accounts/${actor.account.id}/following`,
    { auth: target.auth },
  );
  assertApiError(hiddenBlockedList, 404, "ACCOUNT_NOT_FOUND");

  const followsAfterBlock = await db
    .select()
    .from(accountFollows)
    .where(
      and(
        eq(accountFollows.followerId, actor.account.id),
        eq(accountFollows.followedId, target.account.id),
      ),
    );
  assert.deepEqual(followsAfterBlock, []);
  const reciprocalFollowsAfterBlock = await db
    .select()
    .from(accountFollows)
    .where(
      and(
        eq(accountFollows.followerId, target.account.id),
        eq(accountFollows.followedId, actor.account.id),
      ),
    );
  assert.deepEqual(reciprocalFollowsAfterBlock, []);
  const blocksAfterMutation = await db
    .select()
    .from(accountBlocks)
    .where(eq(accountBlocks.blockerId, actor.account.id));
  assert.ok(
    blocksAfterMutation.some((row) => row.blockedId === target.account.id),
  );

  const unblock = await harness.request(
    `/api/v1/social/blocks/${target.account.id}`,
    { method: "DELETE", auth: actor.auth },
  );
  assert.equal(unblock.response.status, 204);
  const repeatedUnblock = await harness.request(
    `/api/v1/social/blocks/${target.account.id}`,
    { method: "DELETE", auth: actor.auth },
  );
  assert.equal(repeatedUnblock.response.status, 204);
  const blocksAfterUnblock = await db
    .select()
    .from(accountBlocks)
    .where(
      and(
        eq(accountBlocks.blockerId, actor.account.id),
        eq(accountBlocks.blockedId, target.account.id),
      ),
    );
  assert.deepEqual(blocksAfterUnblock, []);

  const followAfterUnblock = await harness.request(followPath, {
    method: "PUT",
    auth: actor.auth,
  });
  assert.equal(
    followAfterUnblock.response.status,
    200,
    JSON.stringify(followAfterUnblock.body),
  );
  const unfollowPath = `/api/v1/social/accounts/${target.account.id}/follow`;
  const unfollow = await harness.request(unfollowPath, {
    method: "DELETE",
    auth: actor.auth,
  });
  assert.equal(unfollow.response.status, 204);
  const repeatedUnfollow = await harness.request(unfollowPath, {
    method: "DELETE",
    auth: actor.auth,
  });
  assert.equal(repeatedUnfollow.response.status, 204);
  const followsAfterUnfollow = await db
    .select()
    .from(accountFollows)
    .where(
      and(
        eq(accountFollows.followerId, actor.account.id),
        eq(accountFollows.followedId, target.account.id),
      ),
    );
  assert.deepEqual(followsAfterUnfollow, []);

  const invalidBlockTarget = await harness.request(
    "/api/v1/social/blocks/not-a-uuid",
    { method: "PUT", auth: actor.auth },
  );
  assertApiError(invalidBlockTarget, 404, "ACCOUNT_NOT_FOUND");
});
