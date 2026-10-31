import assert from "node:assert/strict";
import test from "node:test";
import { createGlobalFeedLister } from "../src/modules/feed/application/listGlobalFeed.ts";
import {
  encodeGlobalFeedCursor,
  parseGlobalFeedCursor,
} from "../src/modules/feed/application/globalFeedCursor.ts";

const viewerId = "22222222-2222-4222-8222-222222222222";
const authorId = "11111111-1111-4111-8111-111111111111";
const otherAuthorId = "33333333-3333-4333-8333-333333333333";
const makePost = (id, postAuthorId = authorId, audience = "public") => ({
  id,
  authorId: postAuthorId,
  content: `post ${id}`,
  audience,
  format: "text",
  articleTitle: null,
  articleBody: null,
  media: [],
  createdAt: new Date("2026-10-27T10:00:00.000Z"),
  updatedAt: new Date("2026-10-27T10:00:00.000Z"),
  version: 1,
});
const makeAuthor = (id, relationship = {}) => ({
  id,
  isPrivate: false,
  relationship: {
    following: "none",
    inCircle: false,
    blockedByMe: false,
    blockedByThem: false,
    ...relationship,
  },
});

test("global feed excludes private, blocked, and non-circle posts before returning views", async () => {
  const posts = [
    makePost("44444444-4444-4444-8444-444444444444", authorId),
    makePost("55555555-5555-4555-8555-555555555555", otherAuthorId),
    makePost("66666666-6666-4666-8666-666666666666", authorId, "circles"),
  ];
  const authors = new Map([
    [authorId, makeAuthor(authorId)],
    [otherAuthorId, makeAuthor(otherAuthorId, { blockedByMe: true })],
  ]);
  const listFeed = createGlobalFeedLister(
    async () => posts,
    async (ids) => ids.flatMap((id) => authors.has(id) ? [authors.get(id)] : []),
    async () => new Map(),
    async () => [],
  );

  const page = await listFeed({
    tab: "for-you",
    viewerId,
    limit: 20,
    cursor: null,
  });
  assert.deepEqual(page.items.map(({ post }) => post.id), [
    "44444444-4444-4444-8444-444444444444",
  ]);
  assert.equal(page.items[0].author.id, authorId);
});

test("following feed scopes repository candidates and requires an accepted relationship", async () => {
  const followedPost = makePost("44444444-4444-4444-8444-444444444444", authorId);
  const pendingPost = makePost("55555555-5555-4555-8555-555555555555", otherAuthorId);
  let listedInput;
  const listFeed = createGlobalFeedLister(
    async (input) => {
      listedInput = input;
      return [followedPost, pendingPost];
    },
    async (ids) => ids.map((id) => makeAuthor(
      id,
      { following: id === authorId ? "accepted" : "pending" },
    )),
    async () => new Map(),
    async (id) => {
      assert.equal(id, viewerId);
      return [authorId, otherAuthorId];
    },
  );

  const page = await listFeed({
    tab: "following",
    viewerId,
    limit: 20,
    cursor: null,
  });
  assert.deepEqual(listedInput.authorIds, [authorId, otherAuthorId]);
  assert.deepEqual(page.items.map(({ post }) => post.id), [followedPost.id]);
});

test("search passes normalized text and an accent-insensitive hashtag prefix to Feed storage", async () => {
  let listedInput;
  const listFeed = createGlobalFeedLister(
    async (input) => {
      listedInput = input;
      return [];
    },
    async () => [],
    async () => new Map(),
    async () => [],
  );

  await listFeed({
    tab: "for-you",
    viewerId: null,
    searchTerm: "  CAFÉ  ",
    limit: 20,
    cursor: null,
  });

  assert.equal(listedInput.searchTerm, "café");
  assert.equal(listedInput.hashtagPrefix, "cafe");
});

test("a search cursor cannot be reused with a different query", () => {
  const position = {
    createdAt: new Date("2026-10-27T10:00:00.000Z"),
    id: "44444444-4444-4444-8444-444444444444",
  };
  const cursor = encodeGlobalFeedCursor(position, {
    tab: "for-you",
    viewerId: null,
    searchTerm: "café",
  });

  assert.equal(
    parseGlobalFeedCursor(cursor, {
      tab: "for-you",
      viewerId: null,
      searchTerm: "café",
    })?.id,
    position.id,
  );
  assert.equal(
    parseGlobalFeedCursor(cursor, {
      tab: "for-you",
      viewerId: null,
      searchTerm: "cafeteira",
    }),
    undefined,
  );
});

test("videos feed requests only video media and returns video post views", async () => {
  const videoPost = {
    ...makePost("77777777-7777-4777-8777-777777777777"),
    format: "media",
    media: [{
      id: "88888888-8888-4888-8888-888888888888",
      type: "video",
    }],
  };
  let listedInput;
  const listFeed = createGlobalFeedLister(
    async (input) => {
      listedInput = input;
      return [videoPost];
    },
    async (ids) => ids.map((id) => makeAuthor(id)),
    async () => new Map(),
    async () => [],
  );

  const page = await listFeed({
    tab: "videos",
    viewerId,
    limit: 20,
    cursor: null,
  });

  assert.equal(listedInput.format, "media");
  assert.equal(listedInput.videoOnly, true);
  assert.equal(page.items[0].post.type, "video");
});

test("global feed cursors are bound to tab and viewer", () => {
  const position = {
    createdAt: new Date("2026-10-27T10:00:00.000Z"),
    id: "44444444-4444-4444-8444-444444444444",
  };
  const scope = { tab: "following", viewerId };
  const cursor = encodeGlobalFeedCursor(position, scope);
  assert.deepEqual(parseGlobalFeedCursor(cursor, scope), position);
  assert.equal(
    parseGlobalFeedCursor(cursor, { tab: "for-you", viewerId }),
    undefined,
  );
  assert.equal(
    parseGlobalFeedCursor(cursor, { tab: "following", viewerId: otherAuthorId }),
    undefined,
  );
});
