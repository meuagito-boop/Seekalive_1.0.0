import assert from "node:assert/strict";
import test from "node:test";
import { createPostCreator } from "../src/modules/feed/application/createPost.ts";
import { createPostDeleter } from "../src/modules/feed/application/deletePost.ts";
import { createProfilePostLister } from "../src/modules/feed/application/listProfilePosts.ts";
import { createArticleReader } from "../src/modules/feed/application/readArticle.ts";
import { createPostReader } from "../src/modules/feed/application/readPost.ts";
import { createPostReferencePreviewReader } from "../src/modules/feed/application/readPostReferencePreview.ts";

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
  }, async () => true);

  assert.equal(await createPost(command), post);
  assert.deepEqual(received, command);

  const failedCreate = createPostCreator(async () => {
    throw new Error("database unavailable");
  }, async () => true);
  await assert.rejects(failedCreate(command), /database unavailable/);
});

test("post creation requires access to a referenced publication before persistence", async () => {
  let persisted = false;
  const createPost = createPostCreator(
    async () => {
      persisted = true;
      return post;
    },
    async () => false,
  );

  await assert.rejects(
    createPost({
      authorId: viewerId,
      content: "Citação",
      audience: "public",
      format: "text",
      reference: { type: "social_post", id: postId },
    }),
    { name: "FeedReferencedPostUnavailableError" },
  );
  assert.equal(persisted, false);
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

test("reference preview uses only currently readable post data and its author", async () => {
  const author = {
    id: authorId,
    username: "conta_social",
    displayName: "Conta Social",
    avatarUrl: null,
  };
  const lookupCalls = [];
  const previewPost = createPostReferencePreviewReader(
    async (requestedPostId, requestedViewerId) => {
      assert.equal(requestedPostId, postId);
      assert.equal(requestedViewerId, viewerId);
      return {
        ...post,
        format: "article",
        article: { title: "Título do artigo", body: "Texto" },
        mediaTypes: ["image"],
        mediaUrls: ["/api/v1/social/media/image-id"],
      };
    },
    async (...args) => {
      lookupCalls.push(args);
      return [author];
    },
  );

  assert.deepEqual(await previewPost(postId, viewerId), {
    type: "social_post",
    id: postId,
    title: "Título do artigo",
    imageUrl: "/api/v1/social/media/image-id",
    subtitle: "@conta_social",
    targetPath: `/article/${postId}`,
    authorName: "Conta Social",
    entityLabel: "Artigo Social",
  });
  assert.deepEqual(lookupCalls, [[[authorId], viewerId]]);

  let authorLookupCalled = false;
  const hiddenPostPreview = createPostReferencePreviewReader(
    async () => null,
    async () => {
      authorLookupCalled = true;
      return [author];
    },
  );
  assert.equal(await hiddenPostPreview(postId, null), null);
  assert.equal(authorLookupCalled, false);
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
