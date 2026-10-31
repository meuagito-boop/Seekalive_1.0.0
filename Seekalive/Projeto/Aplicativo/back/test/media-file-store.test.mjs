import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import {
  detectMediaSignature,
  InvalidMediaDeclarationError,
  MediaUploadTooLargeError,
} from "../src/modules/media/domain/mediaAsset.ts";
import { createAccountMediaPurger } from "../src/modules/media/composition/accountMediaPurge.ts";
import { createLocalMediaFileStore } from "../src/modules/media/infrastructure/localMediaFileStore.ts";

const guardedEnvironmentKeys = [
  "NODE_ENV",
  "REPLIT_DEPLOYMENT",
  "SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS",
  "SEEKALIVE_DATABASE_TARGET",
  "SEEKALIVE_DB_MIGRATION_TARGET",
  "SEEKALIVE_DB_SCHEMA",
];
const originalEnvironment = new Map(
  guardedEnvironmentKeys.map((key) => [key, process.env[key]]),
);
const temporaryRoots = [];

after(async () => {
  for (const [key, value] of originalEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await Promise.all(
    temporaryRoots.map((root) => rm(root, { recursive: true, force: true })),
  );
});

function bytes(...values) {
  return Buffer.from(values);
}

test("detects only supported image and video file signatures", () => {
  assert.equal(detectMediaSignature(bytes(0xff, 0xd8, 0xff, 0x00))?.contentType, "image/jpeg");
  assert.equal(
    detectMediaSignature(bytes(137, 80, 78, 71, 13, 10, 26, 10))?.contentType,
    "image/png",
  );
  assert.equal(detectMediaSignature(Buffer.from("GIF89a"))?.contentType, "image/gif");
  assert.equal(
    detectMediaSignature(Buffer.from("RIFF0000WEBP"))?.contentType,
    "image/webp",
  );
  assert.equal(detectMediaSignature(Buffer.from("0000ftypavif"))?.contentType, "image/avif");
  assert.equal(detectMediaSignature(Buffer.from("0000ftypisom"))?.contentType, "video/mp4");
  assert.equal(
    detectMediaSignature(bytes(0x1a, 0x45, 0xdf, 0xa3))?.contentType,
    "video/webm",
  );
  assert.equal(detectMediaSignature(Buffer.from("<svg></svg>")), null);
});

test("local media store streams files, uses generated keys, and rejects mismatches", async () => {
  process.env.NODE_ENV = "development";
  const root = await mkdtemp(path.join(os.tmpdir(), "seekalive-media-test-"));
  temporaryRoots.push(root);
  const store = createLocalMediaFileStore(root);
  const file = Buffer.from([0xff, 0xd8, 0xff, 1, 2, 3]);
  const result = await store.writeUpload(Readable.from([file]), "image");

  assert.match(result.storageKey, /^[0-9a-f-]{36}$/i);
  assert.equal(result.contentType, "image/jpeg");
  assert.equal((await store.stat(result.storageKey)).sizeBytes, file.length);
  assert.deepEqual(await readFile(path.join(root, result.storageKey)), file);

  await assert.rejects(
    store.writeUpload(Readable.from([file]), "video"),
    InvalidMediaDeclarationError,
  );
  assert.equal((await readdir(root)).length, 1);
});

test("local media store enforces the streaming upload limit and development-only rule", async () => {
  process.env.NODE_ENV = "development";
  const root = await mkdtemp(path.join(os.tmpdir(), "seekalive-media-limit-"));
  temporaryRoots.push(root);
  const store = createLocalMediaFileStore(root);
  const oversized = Buffer.alloc(10 * 1024 * 1024 + 1, 1);
  oversized.set([0xff, 0xd8, 0xff], 0);
  await assert.rejects(
    store.writeUpload(Readable.from([oversized]), "image"),
    MediaUploadTooLargeError,
  );
  assert.deepEqual(await readdir(root), []);

  process.env.NODE_ENV = "test";
  await assert.rejects(
    store.writeUpload(Readable.from([Buffer.from([0xff, 0xd8, 0xff])]), "image"),
    /enabled only in development/,
  );

  process.env.SEEKALIVE_ALLOW_TEMP_SCHEMA_TESTS = "1";
  process.env.SEEKALIVE_DATABASE_TARGET = "replit";
  process.env.SEEKALIVE_DB_MIGRATION_TARGET = "replit";
  process.env.SEEKALIVE_DB_SCHEMA = `seekalive_test_${"a".repeat(32)}`;
  process.env.REPLIT_DEPLOYMENT = "1";
  await assert.rejects(
    store.writeUpload(Readable.from([Buffer.from([0xff, 0xd8, 0xff])]), "image"),
    /enabled only in development/,
  );
});

test("permanent account purge removes all owned media and fails closed without local storage", async () => {
  const removed = [];
  const purge = createAccountMediaPurger(
    async (ownerAccountId) => {
      assert.equal(ownerAccountId, "account-1");
      return [{ storageKey: "asset-1" }, { storageKey: "asset-2" }];
    },
    async (storageKey) => removed.push(storageKey),
    () => true,
  );
  await purge("account-1");
  assert.deepEqual(removed, ["asset-1", "asset-2"]);

  const blockedRemoval = [];
  const unavailableProvider = createAccountMediaPurger(
    async () => [{ storageKey: "asset-3" }],
    async (storageKey) => blockedRemoval.push(storageKey),
    () => false,
  );
  await assert.rejects(unavailableProvider("account-1"), /configured storage provider/);
  assert.deepEqual(blockedRemoval, []);
});
