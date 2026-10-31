import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import {
  assertApiError,
  startIsolatedHttpApiHarness,
} from "./support/isolatedHttpApiHarness.mjs";

let harness;

before(async () => {
  harness = await startIsolatedHttpApiHarness({
    sessionSecret: "seekalive-feed-http-isolated-session-secret",
    requiredTables: [
      "accountBlocks",
      "accountEmails",
      "accountFollows",
      "accountFollowRequests",
      "accountInterests",
      "accountProfiles",
      "accountUsernameReservations",
      "accounts",
      "authChallenges",
      "feedCommentLikes",
      "feedPostBookmarks",
      "feedPostComments",
      "feedPostLikes",
      "feedPostReferences",
      "feedPostReposts",
      "feedPostTags",
      "feedPosts",
      "mediaAssets",
      "passwordCredentials",
      "sessions",
      "trustedDevices",
    ],
  });
});

after(async () => {
  await harness?.close();
});

test("feed HTTP routes enforce identity, privacy, input, ownership and repeat safety", async () => {
  const suffix = randomUUID().replaceAll("-", "").slice(0, 8);
  const owner = await harness.createVerifiedAccount("personal", `fo${suffix}`);
  const other = await harness.createVerifiedAccount("personal", `fx${suffix}`);
  const third = await harness.createVerifiedAccount("personal", `fy${suffix}`);
  const stranger = await harness.createVerifiedAccount(
    "personal",
    `fz${suffix}`,
    "198.51.100.122",
  );

  const createPath = "/api/v1/social/posts";
  const missingAuth = await harness.request(createPath, {
    method: "POST",
    body: { content: "Tentativa sem sessão.", audience: "public" },
  });
  assertApiError(missingAuth, 403, "CSRF_REJECTED");

  const preAuth = await harness.createPreAuth();
  const preAuthWrite = await harness.request(createPath, {
    method: "POST",
    auth: preAuth,
    body: {
      content: "Sessão pré-autenticada não publica.",
      audience: "public",
    },
  });
  assertApiError(preAuthWrite, 401, "UNAUTHENTICATED");

  const noCsrf = await harness.request(createPath, {
    method: "POST",
    auth: { cookie: owner.auth.cookie },
    body: { content: "Sem token CSRF.", audience: "public" },
  });
  assertApiError(noCsrf, 403, "CSRF_REJECTED");

  const invalidPost = await harness.request(createPath, {
    method: "POST",
    auth: owner.auth,
    body: { content: " ", audience: "audience-unknown" },
  });
  assertApiError(invalidPost, 422, "CONTENT_VALIDATION_FAILED");

  const forgedPost = await harness.request(createPath, {
    method: "POST",
    auth: other.auth,
    body: {
      authorId: owner.account.id,
      content: "Tentativa de publicar como outra pessoa.",
      audience: "public",
    },
  });
  assertApiError(forgedPost, 403, "CONTENT_AUTHOR_MISMATCH");

  const publicPostResult = await harness.request(createPath, {
    method: "POST",
    auth: owner.auth,
    body: { content: `Post de borda #feed${suffix}`, audience: "public" },
  });
  assert.equal(
    publicPostResult.response.status,
    201,
    JSON.stringify(publicPostResult.body),
  );
  const publicPostId = publicPostResult.body.id;

  const privatePostResult = await harness.request(createPath, {
    method: "POST",
    auth: owner.auth,
    body: {
      content: "Conteúdo privado para teste isolado.",
      audience: "private",
    },
  });
  assert.equal(
    privatePostResult.response.status,
    201,
    JSON.stringify(privatePostResult.body),
  );
  const privatePostId = privatePostResult.body.id;

  const currentPrivacy = await harness.request("/api/v1/accounts/me/privacy", {
    auth: owner.auth,
  });
  assert.equal(currentPrivacy.response.status, 200);
  const makeOwnerPrivate = await harness.request(
    "/api/v1/accounts/me/privacy",
    {
      method: "PUT",
      auth: owner.auth,
      body: {
        profileVisibility: "private",
        messages: currentPrivacy.body.messages,
        readReceipts: currentPrivacy.body.readReceipts,
        version: currentPrivacy.body.version,
      },
    },
  );
  assert.equal(makeOwnerPrivate.response.status, 200);

  const pendingFollow = await harness.request(
    `/api/v1/social/accounts/${owner.account.id}/follow`,
    { method: "PUT", auth: other.auth },
  );
  assert.equal(pendingFollow.response.status, 200);
  assert.equal(pendingFollow.body.status, "pending");
  const pendingFollowerCannotRead = await harness.request(
    `/api/v1/social/posts/${publicPostId}`,
    { auth: other.auth },
  );
  assertApiError(pendingFollowerCannotRead, 404, "CONTENT_NOT_FOUND");
  const approveFollow = await harness.request(
    `/api/v1/social/follow-requests/${other.account.id}/accept`,
    { method: "POST", auth: owner.auth },
  );
  assert.equal(approveFollow.response.status, 200);
  assert.equal(approveFollow.body.status, "accepted");

  const approveThirdFollow = await harness.request(
    `/api/v1/social/accounts/${owner.account.id}/follow`,
    { method: "PUT", auth: third.auth },
  );
  assert.equal(approveThirdFollow.response.status, 200);
  assert.equal(approveThirdFollow.body.status, "pending");
  const acceptedThirdFollow = await harness.request(
    `/api/v1/social/follow-requests/${third.account.id}/accept`,
    { method: "POST", auth: owner.auth },
  );
  assert.equal(acceptedThirdFollow.response.status, 200);

  const articleInvalid = await harness.request("/api/v1/social/articles", {
    method: "POST",
    auth: owner.auth,
    body: { article: { title: "", body: "" }, audience: "public" },
  });
  assertApiError(articleInvalid, 422, "CONTENT_VALIDATION_FAILED");
  const articleForged = await harness.request("/api/v1/social/articles", {
    method: "POST",
    auth: other.auth,
    body: {
      authorId: owner.account.id,
      article: { title: "Artigo", body: "Conteúdo com tamanho suficiente." },
      audience: "public",
    },
  });
  assertApiError(articleForged, 403, "CONTENT_AUTHOR_MISMATCH");

  const ownerCanReadPrivate = await harness.request(
    `/api/v1/social/posts/${privatePostId}`,
    { auth: owner.auth },
  );
  assert.equal(ownerCanReadPrivate.response.status, 200);
  const strangerCannotReadPrivate = await harness.request(
    `/api/v1/social/posts/${privatePostId}`,
    { auth: stranger.auth },
  );
  assertApiError(strangerCannotReadPrivate, 404, "CONTENT_NOT_FOUND");
  const approvedFollowerCanReadPrivate = await harness.request(
    `/api/v1/social/posts/${privatePostId}`,
    { auth: other.auth },
  );
  assert.equal(approvedFollowerCanReadPrivate.response.status, 200);
  const anonymousCannotReadPrivate = await harness.request(
    `/api/v1/social/posts/${privatePostId}`,
  );
  assertApiError(anonymousCannotReadPrivate, 404, "CONTENT_NOT_FOUND");
  const inaccessiblePrivateArticle = await harness.request(
    "/api/v1/social/articles/not-a-uuid",
  );
  assertApiError(inaccessiblePrivateArticle, 404, "CONTENT_NOT_FOUND");

  const malformedPostId = await harness.request(
    "/api/v1/social/posts/not-a-uuid",
  );
  assertApiError(malformedPostId, 404, "CONTENT_NOT_FOUND");
  const absentPostId = "00000000-0000-4000-8000-000000000000";
  const absentPost = await harness.request(
    `/api/v1/social/posts/${absentPostId}`,
  );
  assertApiError(absentPost, 404, "CONTENT_NOT_FOUND");

  const wrongOwnerDelete = await harness.request(
    `/api/v1/social/posts/${publicPostId}`,
    { method: "DELETE", auth: other.auth },
  );
  assertApiError(wrongOwnerDelete, 404, "CONTENT_NOT_FOUND");
  const postStillExists = await harness.request(
    `/api/v1/social/posts/${publicPostId}`,
    { auth: owner.auth },
  );
  assert.equal(postStillExists.response.status, 200);
  const noCsrfLike = await harness.request(
    `/api/v1/social/posts/${publicPostId}/like`,
    { method: "PUT", auth: { cookie: other.auth.cookie } },
  );
  assertApiError(noCsrfLike, 403, "CSRF_REJECTED");

  const [likeOne, likeTwo] = await Promise.all([
    harness.request(`/api/v1/social/posts/${publicPostId}/like`, {
      method: "PUT",
      auth: { ...other.auth },
    }),
    harness.request(`/api/v1/social/posts/${publicPostId}/like`, {
      method: "PUT",
      auth: { ...other.auth },
    }),
  ]);
  for (const result of [likeOne, likeTwo]) {
    assert.equal(result.response.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.isLiked, true);
    assert.equal(result.body.likes, 1);
  }
  const repeatedUnlike = await harness.request(
    `/api/v1/social/posts/${publicPostId}/like`,
    { method: "DELETE", auth: other.auth },
  );
  assert.equal(repeatedUnlike.response.status, 200);
  assert.equal(repeatedUnlike.body.isLiked, false);
  assert.equal(repeatedUnlike.body.likes, 0);
  const unlikeAgain = await harness.request(
    `/api/v1/social/posts/${publicPostId}/like`,
    { method: "DELETE", auth: other.auth },
  );
  assert.equal(unlikeAgain.response.status, 200);
  assert.equal(unlikeAgain.body.likes, 0);

  const forbiddenPrivateLike = await harness.request(
    `/api/v1/social/posts/${privatePostId}/like`,
    { method: "PUT", auth: stranger.auth },
  );
  assertApiError(forbiddenPrivateLike, 404, "CONTENT_NOT_FOUND");
  const absentBookmark = await harness.request(
    `/api/v1/social/posts/${absentPostId}/bookmark`,
    { method: "PUT", auth: other.auth },
  );
  assertApiError(absentBookmark, 404, "CONTENT_NOT_FOUND");

  const [bookmarkOne, bookmarkTwo] = await Promise.all([
    harness.request(`/api/v1/social/posts/${publicPostId}/bookmark`, {
      method: "PUT",
      auth: { ...other.auth },
    }),
    harness.request(`/api/v1/social/posts/${publicPostId}/bookmark`, {
      method: "PUT",
      auth: { ...other.auth },
    }),
  ]);
  assert.equal(bookmarkOne.response.status, 200);
  assert.equal(bookmarkTwo.response.status, 200);
  assert.equal(bookmarkOne.body.isBookmarked, true);
  assert.equal(bookmarkTwo.body.isBookmarked, true);
  const unbookmark = await harness.request(
    `/api/v1/social/posts/${publicPostId}/bookmark`,
    { method: "DELETE", auth: other.auth },
  );
  assert.equal(unbookmark.response.status, 200);
  assert.equal(unbookmark.body.isBookmarked, false);

  const repost = await harness.request(
    `/api/v1/social/posts/${publicPostId}/repost`,
    { method: "POST", auth: other.auth },
  );
  assert.equal(repost.response.status, 200);
  assert.equal(repost.body.reposts, 1);
  const repeatedRepost = await harness.request(
    `/api/v1/social/posts/${publicPostId}/repost`,
    { method: "POST", auth: other.auth },
  );
  assert.equal(repeatedRepost.response.status, 200);
  assert.equal(repeatedRepost.body.reposts, 1);
  const unrepost = await harness.request(
    `/api/v1/social/posts/${publicPostId}/repost`,
    { method: "DELETE", auth: other.auth },
  );
  assert.equal(unrepost.response.status, 200);
  assert.equal(unrepost.body.reposts, 0);

  const unauthenticatedComments = await harness.request(
    `/api/v1/social/posts/${publicPostId}/comments`,
  );
  assertApiError(unauthenticatedComments, 401, "UNAUTHENTICATED");
  const privateComments = await harness.request(
    `/api/v1/social/posts/${privatePostId}/comments`,
    { auth: stranger.auth },
  );
  assertApiError(privateComments, 404, "CONTENT_NOT_FOUND");
  const approvedFollowerComments = await harness.request(
    `/api/v1/social/posts/${privatePostId}/comments`,
    { auth: other.auth },
  );
  assert.equal(approvedFollowerComments.response.status, 200);
  const commentsBadLimit = await harness.request(
    `/api/v1/social/posts/${publicPostId}/comments?limit=101`,
    { auth: owner.auth },
  );
  assertApiError(commentsBadLimit, 400, "VALIDATION_ERROR");
  const commentsBadCursor = await harness.request(
    `/api/v1/social/posts/${publicPostId}/comments?cursor=malformed`,
    { auth: owner.auth },
  );
  assertApiError(commentsBadCursor, 400, "VALIDATION_ERROR");

  const commentPath = `/api/v1/social/posts/${publicPostId}/comments`;
  const commentInput = {
    text: "Comentário submetido pela rota HTTP.",
    idempotencyKey: randomUUID(),
  };
  const createdComment = await harness.request(commentPath, {
    method: "POST",
    auth: other.auth,
    body: commentInput,
  });
  assert.equal(
    createdComment.response.status,
    201,
    JSON.stringify(createdComment.body),
  );
  const duplicateComment = await harness.request(commentPath, {
    method: "POST",
    auth: other.auth,
    body: commentInput,
  });
  assert.ok([200, 201].includes(duplicateComment.response.status));
  assert.equal(duplicateComment.body.id, createdComment.body.id);
  const conflictingReplay = await harness.request(commentPath, {
    method: "POST",
    auth: other.auth,
    body: { ...commentInput, text: "Mesmo token, conteúdo distinto." },
  });
  assertApiError(conflictingReplay, 409, "CONTENT_IDEMPOTENCY_CONFLICT");
  const wrongAuthorComment = await harness.request(commentPath, {
    method: "POST",
    auth: other.auth,
    body: {
      text: "Autor forjado.",
      idempotencyKey: randomUUID(),
      authorId: owner.account.id,
    },
  });
  assertApiError(wrongAuthorComment, 403, "CONTENT_AUTHOR_MISMATCH");
  const emptyComment = await harness.request(commentPath, {
    method: "POST",
    auth: other.auth,
    body: { text: "   ", idempotencyKey: randomUUID() },
  });
  assertApiError(emptyComment, 422, "CONTENT_VALIDATION_FAILED");

  const otherPost = await harness.request(createPath, {
    method: "POST",
    auth: owner.auth,
    body: {
      content: "Outra publicação para validar reply.",
      audience: "public",
    },
  });
  assert.equal(otherPost.response.status, 201);
  const crossPostReply = await harness.request(
    `/api/v1/social/posts/${otherPost.body.id}/comments`,
    {
      method: "POST",
      auth: other.auth,
      body: {
        text: "Resposta não deve atravessar publicações.",
        idempotencyKey: randomUUID(),
        replyToCommentId: createdComment.body.id,
      },
    },
  );
  assertApiError(crossPostReply, 422, "CONTENT_VALIDATION_FAILED");

  const wrongOwnerCommentDelete = await harness.request(
    `/api/v1/social/comments/${createdComment.body.id}`,
    { method: "DELETE", auth: third.auth },
  );
  assertApiError(wrongOwnerCommentDelete, 404, "CONTENT_NOT_FOUND");
  const independentCommentLike = await harness.request(
    `/api/v1/social/comments/${createdComment.body.id}/like`,
    { method: "PUT", auth: third.auth },
  );
  assert.equal(independentCommentLike.response.status, 200);
  assert.equal(independentCommentLike.body.isLiked, true);
  const deletedComment = await harness.request(
    `/api/v1/social/comments/${createdComment.body.id}`,
    { method: "DELETE", auth: other.auth },
  );
  assert.equal(deletedComment.response.status, 204);
  const repeatedCommentDelete = await harness.request(
    `/api/v1/social/comments/${createdComment.body.id}`,
    { method: "DELETE", auth: other.auth },
  );
  assertApiError(repeatedCommentDelete, 404, "CONTENT_NOT_FOUND");
  const deletedCommentLike = await harness.request(
    `/api/v1/social/comments/${createdComment.body.id}/like`,
    { method: "PUT", auth: owner.auth },
  );
  assertApiError(deletedCommentLike, 404, "CONTENT_NOT_FOUND");

  const profilePath = `/api/v1/social/accounts/${owner.account.id}/posts`;
  const profilePage = await harness.request(`${profilePath}?limit=1`, {
    auth: owner.auth,
  });
  assert.equal(
    profilePage.response.status,
    200,
    JSON.stringify(profilePage.body),
  );
  assert.equal(profilePage.body.items.length, 1);
  assert.ok(profilePage.body.nextCursor);
  const profileNext = await harness.request(
    `${profilePath}?limit=1&cursor=${encodeURIComponent(profilePage.body.nextCursor)}`,
    { auth: owner.auth },
  );
  assert.equal(profileNext.response.status, 200);
  assert.equal(profileNext.body.items.length, 1);
  const cursorOnOtherAccount = await harness.request(
    `/api/v1/social/accounts/${other.account.id}/posts?limit=1&cursor=${encodeURIComponent(profilePage.body.nextCursor)}`,
    { auth: other.auth },
  );
  assertApiError(cursorOnOtherAccount, 400, "VALIDATION_ERROR");
  for (const query of [
    "limit=0",
    "limit=101",
    "format=video",
    "cursor=invalid",
  ]) {
    const invalidPage = await harness.request(`${profilePath}?${query}`);
    assertApiError(invalidPage, 400, "VALIDATION_ERROR");
  }
  const malformedProfile = await harness.request(
    "/api/v1/social/accounts/not-a-uuid/posts",
  );
  assertApiError(malformedProfile, 404, "ACCOUNT_NOT_FOUND");

  const followingUnauthenticated = await harness.request(
    "/api/v1/social/feed?tab=following",
  );
  assertApiError(followingUnauthenticated, 401, "UNAUTHENTICATED");
  for (const query of [
    "tab=unknown",
    "limit=0",
    "limit=51",
    "q=x",
    "cursor=malformed",
  ]) {
    const invalidFeed = await harness.request(`/api/v1/social/feed?${query}`);
    assertApiError(invalidFeed, 400, "VALIDATION_ERROR");
  }
  const publicFeed = await harness.request(
    `/api/v1/social/feed?tab=for-you&limit=50`,
    { auth: stranger.auth },
  );
  assert.equal(publicFeed.response.status, 200);
  assert.ok(
    !publicFeed.body.items.some((item) => item.post.id === privatePostId),
    "Private-audience posts must not appear in the public feed.",
  );

  const ownerPostDelete = await harness.request(
    `/api/v1/social/posts/${privatePostId}`,
    { method: "DELETE", auth: owner.auth },
  );
  assert.equal(ownerPostDelete.response.status, 204);
  const repeatedPostDelete = await harness.request(
    `/api/v1/social/posts/${privatePostId}`,
    { method: "DELETE", auth: owner.auth },
  );
  assertApiError(repeatedPostDelete, 404, "CONTENT_NOT_FOUND");

  const circlePost = await harness.request(createPath, {
    method: "POST",
    auth: owner.auth,
    body: {
      content: "Conteúdo visível somente ao Círculo.",
      audience: "circles",
    },
  });
  assert.equal(circlePost.response.status, 201);
  const nonMutualApprovedFollowerCannotReadCircle = await harness.request(
    `/api/v1/social/posts/${circlePost.body.id}`,
    { auth: third.auth },
  );
  assertApiError(
    nonMutualApprovedFollowerCannotReadCircle,
    404,
    "CONTENT_NOT_FOUND",
  );
  const reciprocalFollow = await harness.request(
    `/api/v1/social/accounts/${other.account.id}/follow`,
    { method: "PUT", auth: owner.auth },
  );
  assert.equal(reciprocalFollow.response.status, 200);
  assert.equal(reciprocalFollow.body.status, "accepted");
  const circleMemberCanRead = await harness.request(
    `/api/v1/social/posts/${circlePost.body.id}`,
    { auth: other.auth },
  );
  assert.equal(circleMemberCanRead.response.status, 200);
  const strangerCannotReadCircle = await harness.request(
    `/api/v1/social/posts/${circlePost.body.id}`,
    { auth: stranger.auth },
  );
  assertApiError(strangerCannotReadCircle, 404, "CONTENT_NOT_FOUND");
});
