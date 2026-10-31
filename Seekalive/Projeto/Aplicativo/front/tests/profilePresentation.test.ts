import assert from "node:assert/strict";
import { test } from "node:test";
import type { Post } from "../src/data/mockData";
import { getProfileMedia } from "../src/lib/postMedia";
import { buildProfileTimeline } from "../src/modules/profile/utils/profileTimeline";

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: "post-1",
    authorId: "merchant",
    content: "Publicação",
    audience: "public",
    format: "media",
    type: "text",
    createdAt: "2026-01-01T10:00:00.000Z",
    likes: 0,
    comments: 0,
    reposts: 0,
    shares: 0,
    isLiked: false,
    isReposted: false,
    mentions: [],
    hashtags: [],
    mediaUrls: [],
    mediaTypes: [],
    ...overrides,
  };
}

test("profile media uses the same private-account and audience rules as post reading", () => {
  const posts = [
    makePost({ id: "public", audience: "public", mediaUrls: ["public.jpg"], mediaTypes: ["image"] }),
    makePost({ id: "circle", audience: "circles", mediaUrls: ["circle.mp4"], mediaTypes: ["video"] }),
    makePost({ id: "private", audience: "private", mediaUrls: ["private.jpg"], mediaTypes: ["image"] }),
  ];

  assert.deepEqual(
    getProfileMedia(posts, "merchant", false, false, true, false),
    [],
  );
  assert.deepEqual(
    getProfileMedia(posts, "merchant", false, true, true, true).map((media) => media.id),
    ["public-0", "circle-0", "private-0"],
  );
  assert.deepEqual(
    getProfileMedia(posts, "merchant", true, false, true, false).map((media) => media.id),
    ["public-0", "circle-0", "private-0"],
  );
});

test("personal and commercial profiles share ordered timelines and omit unreadable originals", () => {
  const posts = [
    { id: "older", authorId: "merchant", createdAt: "2026-01-01T10:00:00.000Z" },
    { id: "hidden", authorId: "other", createdAt: "2026-01-02T10:00:00.000Z" },
    { id: "newer", authorId: "merchant", createdAt: "2026-01-03T10:00:00.000Z" },
    { id: "reposted", authorId: "other", createdAt: "2026-01-04T10:00:00.000Z" },
  ];
  const reposts = [
    { id: "repost-visible", authorId: "merchant", postId: "reposted", createdAt: "2026-01-05T10:00:00.000Z" },
    { id: "repost-hidden", authorId: "merchant", postId: "hidden", createdAt: "2026-01-06T10:00:00.000Z" },
  ];

  const timeline = buildProfileTimeline(posts, reposts, "merchant", (post) => post.id !== "hidden");

  assert.deepEqual(timeline.map((entry) => entry.key), ["repost-visible", "newer", "older"]);
  assert.equal(timeline[0]?.post.id, "reposted");
  assert.equal(timeline[0]?.repostedById, "merchant");
});
