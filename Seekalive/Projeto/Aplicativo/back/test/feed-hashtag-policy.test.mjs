import assert from "node:assert/strict";
import test from "node:test";
import {
  createArticleSchema,
  createTextPostSchema,
  countPostHashtags,
  extractPostHashtags,
  normalizeHashtagPrefix,
} from "@workspace/api-zod";
import { createPostCreator } from "../src/modules/feed/application/createPost.ts";

const audience = "public";
const tags = (count, offset = 0) =>
  Array.from({ length: count }, (_, index) => `#tag${index + offset}`).join(
    " ",
  );

test("hashtag normalization is case- and diacritic-insensitive", () => {
  assert.equal(normalizeHashtagPrefix("Café"), "cafe");
  assert.equal(normalizeHashtagPrefix("#CAFÉ"), "cafe");
  assert.equal(normalizeHashtagPrefix("café  quente"), null);
  assert.deepEqual(extractPostHashtags("#Café #cafe #Cafeteira"), [
    "café",
    "cafeteira",
  ]);
  assert.equal(countPostHashtags("#Café #cafe #cafeteira"), 2);
});

test("text and media posts accept at most ten distinct hashtags", () => {
  assert.equal(
    createTextPostSchema.safeParse({
      content: tags(10),
      audience,
    }).success,
    true,
  );
  assert.equal(
    createTextPostSchema.safeParse({
      content: tags(11),
      audience,
    }).success,
    false,
  );
  assert.equal(
    createTextPostSchema.safeParse({
      content: "#Café #cafe",
      audience,
    }).success,
    true,
  );
});

test("article hashtag limit covers caption, title, and body together", () => {
  assert.equal(
    createArticleSchema.safeParse({
      audience,
      content: tags(4),
      article: {
        title: tags(3, 4),
        body: tags(3, 7),
      },
    }).success,
    true,
  );
  assert.equal(
    createArticleSchema.safeParse({
      audience,
      content: tags(4),
      article: {
        title: tags(3, 4),
        body: tags(4, 7),
      },
    }).success,
    false,
  );
});

test("application use case rejects excess hashtags before persistence", async () => {
  let persistenceCalled = false;
  const createPost = createPostCreator(async () => {
    persistenceCalled = true;
    throw new Error("persistence should not be called");
  }, async () => true);

  await assert.rejects(
    createPost({
      authorId: "user-1",
      content: tags(11),
      audience,
      format: "text",
    }),
    /no máximo 10 hashtags/,
  );
  assert.equal(persistenceCalled, false);
});
