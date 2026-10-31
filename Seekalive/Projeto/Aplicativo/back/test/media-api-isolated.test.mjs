import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { eq } from "drizzle-orm";
import { startIsolatedHttpApiHarness } from "./support/isolatedHttpApiHarness.mjs";

const sessionSecret = "seekalive-media-api-isolated-session-secret";
const requiredTables = [
  "accounts",
  "accountEmails",
  "accountInterests",
  "accountUsernameReservations",
  "accountProfiles",
  "commercialProfiles",
  "authChallenges",
  "passwordCredentials",
  "sessions",
  "trustedDevices",
  "feedPosts",
  "mediaAssets",
];

let harness;
let localMediaFileStore;

before(async () => {
  harness = await startIsolatedHttpApiHarness({
    sessionSecret,
    requiredTables,
  });
  ({ localMediaFileStore } = await import(
    "../src/modules/media/infrastructure/localMediaFileStore.ts"
  ));

  harness.addCleanup(async ({ database }) => {
    const storedAssets = await database.db
      .select({ storageKey: database.mediaAssets.storageKey })
      .from(database.mediaAssets);
    for (const { storageKey } of storedAssets) {
      await localMediaFileStore.remove(storageKey);
    }
  });
});

after(async () => {
  await harness?.close();
});

function uploadHeaders(type) {
  return {
    "content-type": "application/octet-stream",
    "x-seekalive-media-type": type,
  };
}

test("real media HTTP routes upload, authorize reads, stream ranges, and delete staged files", async () => {
  const suffix = `m${Date.now().toString(36)}`;
  const owner = await harness.createVerifiedAccount("personal", suffix);
  const otherUser = await harness.createVerifiedAccount(
    "personal",
    `o${suffix.slice(1)}`,
  );
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x10, 0x20, 0x30, 0x40, 0x50]);
  const mp4 = Buffer.from("0000ftypisom0000", "ascii");

  const preAuth = await harness.createPreAuth();
  const notLoggedIn = await harness.request("/api/v1/social/media", {
    method: "POST",
    auth: preAuth,
    headers: uploadHeaders("image"),
    body: jpeg,
  });
  assert.equal(notLoggedIn.response.status, 401, JSON.stringify(notLoggedIn.body));
  assert.equal(notLoggedIn.body?.error?.key, "UNAUTHENTICATED");

  const missingCsrf = await harness.request("/api/v1/social/media", {
    method: "POST",
    auth: { cookie: owner.cookie },
    headers: uploadHeaders("image"),
    body: jpeg,
  });
  assert.equal(missingCsrf.response.status, 403, JSON.stringify(missingCsrf.body));
  assert.equal(missingCsrf.body?.error?.key, "CSRF_REJECTED");

  const unsupported = await harness.request("/api/v1/social/media", {
    method: "POST",
    auth: owner.auth,
    headers: uploadHeaders("image"),
    body: Buffer.from("not an image or video"),
  });
  assert.equal(unsupported.response.status, 415, JSON.stringify(unsupported.body));
  assert.equal(unsupported.body?.error?.key, "CONTENT_VALIDATION_FAILED");

  const jpegUpload = await harness.request("/api/v1/social/media", {
    method: "POST",
    auth: owner.auth,
    headers: uploadHeaders("image"),
    body: jpeg,
  });
  assert.equal(jpegUpload.response.status, 201, JSON.stringify(jpegUpload.body));
  assert.match(jpegUpload.body.id, /^[0-9a-f-]{36}$/i);
  assert.equal(jpegUpload.body.type, "image");
  assert.equal(jpegUpload.body.contentType, "image/jpeg");
  assert.equal(jpegUpload.body.sizeBytes, jpeg.length);
  assert.equal(
    jpegUpload.body.url,
    `/api/v1/social/media/${jpegUpload.body.id}`,
  );
  assert.ok(Number.isFinite(Date.parse(jpegUpload.body.expiresAt)));

  const mp4Upload = await harness.request("/api/v1/social/media", {
    method: "POST",
    auth: owner.auth,
    headers: uploadHeaders("video"),
    body: mp4,
  });
  assert.equal(mp4Upload.response.status, 201, JSON.stringify(mp4Upload.body));
  assert.equal(mp4Upload.body.type, "video");
  assert.equal(mp4Upload.body.contentType, "video/mp4");
  assert.equal(mp4Upload.body.sizeBytes, mp4.length);
  assert.equal(
    mp4Upload.body.url,
    `/api/v1/social/media/${mp4Upload.body.id}`,
  );
  assert.ok(Number.isFinite(Date.parse(mp4Upload.body.expiresAt)));

  const jpegId = jpegUpload.body.id;
  const jpegUrl = `/api/v1/social/media/${jpegId}`;
  const otherUserRead = await harness.request(jpegUrl, {
    auth: otherUser.auth,
  });
  assert.equal(otherUserRead.response.status, 404);
  assert.equal(otherUserRead.body?.error?.key, "CONTENT_NOT_FOUND");

  const missingAsset = await harness.request(
    "/api/v1/social/media/00000000-0000-4000-8000-000000000000",
  );
  assert.equal(missingAsset.response.status, 404);
  assert.equal(missingAsset.body?.error?.key, "CONTENT_NOT_FOUND");

  const rangedRead = await harness.request(jpegUrl, {
    auth: owner.auth,
    headers: { range: "bytes=1-4" },
  });
  assert.equal(rangedRead.response.status, 206);
  assert.equal(rangedRead.response.headers.get("content-range"), `bytes 1-4/${jpeg.length}`);
  assert.deepEqual(rangedRead.body, jpeg.subarray(1, 5));

  const mp4Read = await harness.request(mp4Upload.body.url, {
    auth: owner.auth,
  });
  assert.equal(mp4Read.response.status, 200);
  assert.equal(mp4Read.response.headers.get("content-type"), "video/mp4");
  assert.deepEqual(mp4Read.body, mp4);

  const [jpegAsset] = await harness.database.db
    .select({
      id: harness.database.mediaAssets.id,
      storageKey: harness.database.mediaAssets.storageKey,
      ownerAccountId: harness.database.mediaAssets.ownerAccountId,
      mediaType: harness.database.mediaAssets.mediaType,
      contentType: harness.database.mediaAssets.contentType,
      sizeBytes: harness.database.mediaAssets.sizeBytes,
    })
    .from(harness.database.mediaAssets)
    .where(eq(harness.database.mediaAssets.id, jpegId));
  assert.ok(jpegAsset);
  assert.equal(jpegAsset.ownerAccountId, owner.account.id);
  assert.equal(jpegAsset.mediaType, "image");
  assert.equal(jpegAsset.contentType, "image/jpeg");
  assert.equal(jpegAsset.sizeBytes, jpeg.length);
  const deletedStorageKey = jpegAsset.storageKey;

  const missingDeleteCsrf = await harness.request(jpegUrl, {
    method: "DELETE",
    auth: { cookie: owner.cookie },
  });
  assert.equal(
    missingDeleteCsrf.response.status,
    403,
    JSON.stringify(missingDeleteCsrf.body),
  );
  assert.equal(missingDeleteCsrf.body?.error?.key, "CSRF_REJECTED");

  const otherUserDelete = await harness.request(jpegUrl, {
    method: "DELETE",
    auth: otherUser.auth,
  });
  assert.equal(otherUserDelete.response.status, 404);
  assert.equal(otherUserDelete.body?.error?.key, "CONTENT_NOT_FOUND");

  const deleted = await harness.request(jpegUrl, {
    method: "DELETE",
    auth: owner.auth,
  });
  assert.equal(deleted.response.status, 204);
  assert.equal(deleted.body, null);
  await assert.rejects(
    localMediaFileStore.stat(deletedStorageKey),
    (error) => error?.code === "ENOENT",
  );
  const deletedRows = await harness.database.db
    .select({ id: harness.database.mediaAssets.id })
    .from(harness.database.mediaAssets)
    .where(eq(harness.database.mediaAssets.id, jpegId));
  assert.deepEqual(deletedRows, []);
});
