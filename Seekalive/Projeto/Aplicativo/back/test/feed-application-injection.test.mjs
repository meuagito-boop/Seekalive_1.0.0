import assert from "node:assert/strict";
import test from "node:test";
import { createPostCreator } from "../src/modules/feed/application/createPost.ts";
import { createPostDeleter } from "../src/modules/feed/application/deletePost.ts";
import { createProfilePostLister } from "../src/modules/feed/application/listProfilePosts.ts";
import { createArticleReader } from "../src/modules/feed/application/readArticle.ts";
import { createPostReader } from "../src/modules/feed/application/readPost.ts";

const authorId = "11111111-1111-4111-8111-111111111111";
const viewerId = "22222222-2222-4222-8222-222222222222";
const postId = "33333333-3333-4333-8333-333333333333";
const post = {
  id: postId,
  authorId,
  content: "Publicação de teste",
  audience: "public",
  format: "text",
  articleTitle: null,
  articleBody: null,
  media: [],
  createdAt: new Date("2026-10-27T10:00:00.000Z"),
  updatedAt: new Date("2026-10-27T10:00:00.000Z"),
};
const publicAuthor = {
  id: authorId,
  isPrivate: false,
  relationship: {
    following: "none",
    inCircle: false,
    blockedByMe: false,
    blockedByThem: false,
  },
};

test("post creation delegates persistence and propagates repository failures", async () => {
  const command = {
    authorId,
    content: post.content,
    audience: "public",
    format: "text",
  };
  let received;
  const createPost = createPostCreator(async (input) => {
    received = input;
    return post;
  });

  assert.equal(await createPost(command), post);
  assert.deepEqual(received, command);

  const failedCreate = createPostCreator(async () => {
    throw new Error("database unavailable");
  });
  await assert.rejects(failedCreate(command), /database unavailable/);
});

test("post deletion delegates the post and actor identifiers", async () => {
  const received = [];
  const deletePost = createPostDeleter(async (...args) => {
    received.push(args);
    return true;
  });

  assert.equal(await deletePost(postId, authorId), true);
  assert.deepEqual(received, [[postId, authorId]]);
});

test("post read resolves the author before applying visibility", async () => {
  const authorLookups = [];
  const readPost = createPostReader(
    async () => post,
    async (...args) => {
      authorLookups.push(args);
      return [publicAuthor];
    },
    async () => new Map(),
  );

  const result = await readPost(postId, viewerId);
  assert.equal(result.id, postId);
  assert.deepEqual(authorLookups, [[[authorId], viewerId]]);

  const blockedRead = createPostReader(
    async () => post,
    async () => [
      {
        ...publicAuthor,
        relationship: { ...publicAuthor.relationship, blockedByThem: true },
      },
    ],
    async () => new Map(),
  );
  assert.equal(await blockedRead(postId, viewerId), null);
});

test("article read returns only visible posts with article format", async () => {
  const articleView = { id: postId, format: "article" };
  const readArticle = createArticleReader(async () => articleView);
  const readTextAsArticle = createArticleReader(async () => ({
    ...articleView,
    format: "text",
  }));

  assert.equal(await readArticle(postId, viewerId), articleView);
  assert.equal(await readTextAsArticle(postId, viewerId), null);
});

test("profile post listing injects the author lookup and storage query", async () => {
  const authorLookups = [];
  const postQueries = [];
  const listPosts = createProfilePostLister(
    async (query) => {
      postQueries.push(query);
      return [post];
    },
    async (...args) => {
      authorLookups.push(args);
      return [publicAuthor];
    },
    async () => new Map(),
  );

  const page = await listPosts(authorId, viewerId, 10, null, "all");
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].id, postId);
  assert.equal(page.nextCursor, null);
  assert.deepEqual(authorLookups, [[[authorId], viewerId]]);
  assert.deepEqual(postQueries, [
    {
      authorId,
      format: "all",
      after: null,
      limit: 100,
    },
  ]);
});
