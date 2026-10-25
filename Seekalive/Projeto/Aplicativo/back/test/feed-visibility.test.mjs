import assert from "node:assert/strict";
import { test } from "node:test";
import { canReadPost } from "../src/modules/feed/application/postVisibility.ts";
import { parsePostCursor } from "../src/modules/feed/application/postCursor.ts";
import {
  createArticleSchema,
  createTextPostSchema,
} from "../../../shared/contracts/src/feed.ts";
import { encodePostCursor } from "../src/modules/feed/application/postCursor.ts";

const authorId = "11111111-1111-4111-8111-111111111111";
const viewerId = "22222222-2222-4222-8222-222222222222";
const baseAuthor = {
  id: authorId,
  isPrivate: false,
  relationship: {
    following: "none",
    inCircle: false,
    blockedByMe: false,
    blockedByThem: false,
  },
};

test("public posts can be read anonymously only when the author profile is public", () => {
  const post = { authorId, audience: "public" };
  assert.equal(canReadPost(post, null, baseAuthor), true);
  assert.equal(canReadPost(post, null, { ...baseAuthor, isPrivate: true }), false);
});

test("approved followers can read public content, but Circle remains mutual", () => {
  const approvedFollower = {
    ...baseAuthor,
    isPrivate: true,
    relationship: { ...baseAuthor.relationship, following: "accepted" },
  };
  assert.equal(canReadPost({ authorId, audience: "public" }, viewerId, approvedFollower), true);
  assert.equal(canReadPost({ authorId, audience: "circles" }, viewerId, approvedFollower), false);

  const mutualFollower = {
    ...approvedFollower,
    relationship: { ...approvedFollower.relationship, inCircle: true },
  };
  assert.equal(canReadPost({ authorId, audience: "circles" }, viewerId, mutualFollower), true);
});

test("private-audience posts are owner-only and blocks hide all post audiences", () => {
  const privatePost = { authorId, audience: "private" };
  assert.equal(canReadPost(privatePost, authorId, baseAuthor), true);
  assert.equal(canReadPost(privatePost, viewerId, baseAuthor), false);
  assert.equal(canReadPost(
    { authorId, audience: "public" },
    viewerId,
    { ...baseAuthor, relationship: { ...baseAuthor.relationship, blockedByMe: true } },
  ), false);
});

test("text and article contracts enforce length, audience, and required fields", () => {
  assert.equal(createTextPostSchema.safeParse({ content: "  texto  ", audience: "public" }).success, true);
  assert.equal(createTextPostSchema.safeParse({ content: " ", audience: "public" }).success, false);
  assert.equal(createTextPostSchema.safeParse({ content: "a".repeat(281), audience: "public" }).success, false);
  assert.equal(createTextPostSchema.safeParse({ content: "texto", audience: "everyone" }).success, false);
  assert.equal(createArticleSchema.safeParse({
    audience: "circles",
    article: { title: "Título", body: "Corpo do artigo" },
  }).success, true);
  assert.equal(createArticleSchema.safeParse({
    audience: "public",
    article: { title: "", body: "Corpo" },
  }).success, false);
});

test("post pagination cursors reject malformed values", () => {
  const scope = { authorId, format: "all" };
  assert.equal(parsePostCursor(undefined, scope), null);
  assert.equal(parsePostCursor("not-a-cursor", scope), undefined);
  assert.equal(parsePostCursor("x".repeat(513), scope), undefined);
  const cursor = encodePostCursor({
    id: "33333333-3333-4333-8333-333333333333",
    createdAt: new Date("2026-10-25T12:00:00.000Z"),
  }, scope);
  assert.ok(cursor.length < 512);
  assert.deepEqual(parsePostCursor(cursor, scope), {
    id: "33333333-3333-4333-8333-333333333333",
    createdAt: new Date("2026-10-25T12:00:00.000Z"),
  });
  assert.equal(parsePostCursor(cursor, { ...scope, format: "article" }), undefined);
  assert.equal(parsePostCursor(cursor, { ...scope, authorId: viewerId }), undefined);
});
