import assert from "node:assert/strict";
import test from "node:test";
import { createPostCommentCreator } from "../src/modules/feed/application/createPostComment.ts";
import { createPostCommentDeleter } from "../src/modules/feed/application/deletePostComment.ts";
import { createPostCommentLister } from "../src/modules/feed/application/listPostComments.ts";
import { createCommentLikeSetter } from "../src/modules/feed/application/setCommentLike.ts";
import { createPostLikeSetter } from "../src/modules/feed/application/setPostLike.ts";
import { createPostRepostSetter } from "../src/modules/feed/application/setPostRepost.ts";

const authorId = "11111111-1111-4111-8111-111111111111";
const viewerId = "22222222-2222-4222-8222-222222222222";
const postId = "33333333-3333-4333-8333-333333333333";
const commentId = "44444444-4444-4444-8444-444444444444";
const createdAt = new Date("2026-10-31T12:00:00.000Z");
const author = {
  id: authorId,
  username: "autora",
  displayName: "Autora",
  avatarUrl: null,
};
const comment = {
  id: commentId,
  postId,
  authorId,
  clientMutationId: "mutation-1",
  replyToCommentId: null,
  content: "Comentário",
  createdAt,
};

test("comment creation verifies post visibility, normalizes text and maps the response", async () => {
  const persisted = [];
  const createComment = createPostCommentCreator({
    readPost: async (requestedPostId, viewer) => {
      assert.equal(requestedPostId, postId);
      assert.equal(viewer, viewerId);
      return { id: postId };
    },
    findCommentOnPost: async () => null,
    insertComment: async (input) => {
      persisted.push(input);
      return comment;
    },
    findAuthors: async () => [author],
    findInteraction: async () => ({ likes: 2, isLiked: true }),
  });

  const result = await createComment({
    postId,
    authorId: viewerId,
    idempotencyKey: "mutation-1",
    replyToCommentId: null,
    content: "  Olá  ",
  });

  assert.deepEqual(persisted, [
    {
      postId,
      authorId: viewerId,
      clientMutationId: "mutation-1",
      replyToCommentId: null,
      content: "Olá",
    },
  ]);
  assert.equal(result.id, commentId);
  assert.equal(result.createdAt, createdAt.toISOString());
  assert.deepEqual(result.author, author);
  assert.equal(result.likes, 2);
  assert.equal(result.isLiked, true);
  assert.equal("clientMutationId" in result, false);
});

test("comment creation does not persist hidden posts or replies outside the post", async () => {
  let inserts = 0;
  const hiddenPost = createPostCommentCreator({
    readPost: async () => null,
    findCommentOnPost: async () => null,
    insertComment: async () => {
      inserts += 1;
      return comment;
    },
    findAuthors: async () => [author],
    findInteraction: async () => ({ likes: 0, isLiked: false }),
  });
  assert.equal(
    await hiddenPost({
      postId,
      authorId: viewerId,
      idempotencyKey: "mutation-2",
      replyToCommentId: null,
      content: "Não deve gravar",
    }),
    null,
  );

  const missingReplyTarget = createPostCommentCreator({
    readPost: async () => ({ id: postId }),
    findCommentOnPost: async (requestedCommentId, requestedPostId) => {
      assert.equal(requestedCommentId, commentId);
      assert.equal(requestedPostId, postId);
      return null;
    },
    insertComment: async () => {
      inserts += 1;
      return comment;
    },
    findAuthors: async () => [author],
    findInteraction: async () => ({ likes: 0, isLiked: false }),
  });

  await assert.rejects(
    missingReplyTarget({
      postId,
      authorId: viewerId,
      idempotencyKey: "mutation-3",
      replyToCommentId: commentId,
      content: "Resposta",
    }),
    { name: "FeedCommentReplyNotFound" },
  );
  assert.equal(inserts, 0);
});

test("comment listing checks post visibility and paginates enriched views", async () => {
  const rows = [
    { ...comment, id: commentId },
    { ...comment, id: "55555555-5555-4555-8555-555555555555" },
    { ...comment, id: "66666666-6666-4666-8666-666666666666" },
  ];
  const queries = [];
  const listComments = createPostCommentLister({
    readPost: async () => ({ id: postId }),
    listComments: async (query) => {
      queries.push(query);
      return rows;
    },
    findAuthors: async () => [author],
    findInteractions: async (ids) =>
      new Map(ids.map((id) => [id, { likes: 1, isLiked: id === commentId }])),
  });

  const page = await listComments(postId, viewerId, 2, null);
  assert.equal(queries[0].limit, 3);
  assert.equal(page.items.length, 2);
  assert.equal(page.items[0].id, commentId);
  assert.equal(page.items[0].isLiked, true);
  assert.equal(page.items[1].isLiked, false);
  assert.ok(page.nextCursor);

  let listed = false;
  const hiddenPost = createPostCommentLister({
    readPost: async () => null,
    listComments: async () => {
      listed = true;
      return [];
    },
    findAuthors: async () => [],
    findInteractions: async () => new Map(),
  });
  assert.equal(await hiddenPost(postId, viewerId, 20, null), null);
  assert.equal(listed, false);
});

test("post like and repost setters authorize before persistence and return fresh views", async () => {
  for (const [createSetter, expectedFlag] of [
    [createPostLikeSetter, true],
    [createPostRepostSetter, true],
  ]) {
    for (const liked of [expectedFlag, false]) {
      const reads = [];
      const persisted = [];
      const setter = createSetter(
        async (...args) => {
          reads.push(args);
          return { id: postId, version: reads.length };
        },
        async (...args) => persisted.push(args),
      );

      const result = await setter(postId, viewerId, liked);
      assert.equal(result.version, 2);
      assert.deepEqual(reads, [
        [postId, viewerId],
        [postId, viewerId],
      ]);
      assert.deepEqual(persisted, [[postId, viewerId, liked]]);
    }

    let mutated = false;
    const hidden = createSetter(async () => null, async () => {
      mutated = true;
    });
    assert.equal(await hidden(postId, viewerId, false), null);
    assert.equal(mutated, false);
  }
});

test("comment likes authorize the parent post before mutation and map current state", async () => {
  let commentReads = 0;
  const persisted = [];
  const setLike = createCommentLikeSetter({
    findComment: async () => {
      commentReads += 1;
      return comment;
    },
    readPost: async (requestedPostId, viewer) => {
      assert.equal(requestedPostId, postId);
      assert.equal(viewer, viewerId);
      return { id: postId };
    },
    persistLike: async (...args) => persisted.push(args),
    findAuthors: async () => [author],
    findInteraction: async () => {
      const liked = persisted.at(-1)?.[2] ?? false;
      return { likes: liked ? 3 : 2, isLiked: liked };
    },
  });

  const result = await setLike(commentId, viewerId, true);
  assert.deepEqual(persisted, [[commentId, viewerId, true]]);
  assert.equal(commentReads, 2);
  assert.equal(result.id, commentId);
  assert.equal(result.likes, 3);
  assert.equal(result.isLiked, true);

  const removed = await setLike(commentId, viewerId, false);
  assert.deepEqual(persisted, [
    [commentId, viewerId, true],
    [commentId, viewerId, false],
  ]);
  assert.equal(removed.likes, 2);
  assert.equal(removed.isLiked, false);

  let mutated = false;
  const hidden = createCommentLikeSetter({
    findComment: async () => comment,
    readPost: async () => null,
    persistLike: async () => {
      mutated = true;
    },
    findAuthors: async () => [author],
    findInteraction: async () => ({ likes: 0, isLiked: false }),
  });
  assert.equal(await hidden(commentId, viewerId, true), null);
  assert.equal(mutated, false);
});

test("comment deletion delegates the comment and authenticated author identifiers", async () => {
  const received = [];
  const deleteComment = createPostCommentDeleter(async (...args) => {
    received.push(args);
    return true;
  });

  assert.equal(await deleteComment(commentId, viewerId), true);
  assert.deepEqual(received, [[commentId, viewerId]]);
});
