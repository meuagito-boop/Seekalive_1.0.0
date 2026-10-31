import { and, asc, eq, gt, inArray, lt } from "drizzle-orm";
import {
  db,
  mediaAssets,
  type DatabaseTransaction,
} from "@workspace/db";
import type {
  DetectedMedia,
  StagedMediaAsset,
} from "../domain/mediaAsset";

function toStagedMediaAsset(
  row: typeof mediaAssets.$inferSelect,
): StagedMediaAsset {
  if (row.mediaType !== "image" && row.mediaType !== "video") {
    throw new Error("Invalid media type stored in database.");
  }
  return {
    id: row.id,
    ownerAccountId: row.ownerAccountId,
    postId: row.postId,
    position: row.position,
    storageKey: row.storageKey,
    mediaType: row.mediaType,
    contentType: row.contentType as DetectedMedia["contentType"],
    sizeBytes: row.sizeBytes,
    state: row.state === "attached" ? "attached" : "staged",
    expiresAt: row.expiresAt,
  };
}

export async function insertStagedMediaAsset(input: {
  id: string;
  ownerAccountId: string;
  storageKey: string;
  type: DetectedMedia["type"];
  contentType: DetectedMedia["contentType"];
  sizeBytes: number;
  expiresAt: Date;
}) {
  const [row] = await db
    .insert(mediaAssets)
    .values({
      id: input.id,
      ownerAccountId: input.ownerAccountId,
      storageKey: input.storageKey,
      mediaType: input.type,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      state: "staged",
      expiresAt: input.expiresAt,
    })
    .returning();
  if (!row) throw new Error("Staged media insert returned no row.");
  return toStagedMediaAsset(row);
}

export async function findStagedMediaAssets(
  transaction: DatabaseTransaction,
  input: { ownerAccountId: string; assetIds: string[]; now: Date },
) {
  if (input.assetIds.length === 0) return [];
  const rows = await transaction
    .select()
    .from(mediaAssets)
    .where(
      and(
        inArray(mediaAssets.id, input.assetIds),
        eq(mediaAssets.ownerAccountId, input.ownerAccountId),
        eq(mediaAssets.state, "staged"),
        gt(mediaAssets.expiresAt, input.now),
      ),
    )
    .for("update");
  const byId = new Map(rows.map((row) => [row.id, toStagedMediaAsset(row)]));
  return input.assetIds.map((id) => byId.get(id) ?? null);
}

export async function attachStagedMediaAssets(
  transaction: DatabaseTransaction,
  input: {
    ownerAccountId: string;
    postId: string;
    assetIds: string[];
  },
) {
  for (const [position, assetId] of input.assetIds.entries()) {
    const [updated] = await transaction
      .update(mediaAssets)
      .set({
        postId: input.postId,
        position,
        state: "attached",
      })
      .where(
        and(
          eq(mediaAssets.id, assetId),
          eq(mediaAssets.ownerAccountId, input.ownerAccountId),
          eq(mediaAssets.state, "staged"),
        ),
      )
      .returning({ id: mediaAssets.id });
    if (!updated) throw new Error("Media asset changed during post creation.");
  }
}

export async function findMediaAssetById(assetId: string) {
  const [row] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, assetId))
    .limit(1);
  return row ? toStagedMediaAsset(row) : null;
}

export async function deleteOwnedStagedMediaAsset(
  assetId: string,
  ownerAccountId: string,
) {
  const [row] = await db
    .delete(mediaAssets)
    .where(
      and(
        eq(mediaAssets.id, assetId),
        eq(mediaAssets.ownerAccountId, ownerAccountId),
        eq(mediaAssets.state, "staged"),
      ),
    )
    .returning({ storageKey: mediaAssets.storageKey });
  return row ?? null;
}

export async function listExpiredStagedMediaAssets(now: Date) {
  return db
    .select({
      id: mediaAssets.id,
      storageKey: mediaAssets.storageKey,
    })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.state, "staged"), lt(mediaAssets.expiresAt, now)))
    .orderBy(asc(mediaAssets.expiresAt))
    .limit(100);
}

export async function deleteExpiredStagedMediaAsset(id: string, now: Date) {
  await db
    .delete(mediaAssets)
    .where(
      and(
        eq(mediaAssets.id, id),
        eq(mediaAssets.state, "staged"),
        lt(mediaAssets.expiresAt, now),
      ),
    );
}

export async function deleteMediaAssetsForPost(
  transaction: DatabaseTransaction,
  postId: string,
) {
  return transaction
    .select({ storageKey: mediaAssets.storageKey })
    .from(mediaAssets)
    .where(and(eq(mediaAssets.postId, postId), eq(mediaAssets.state, "attached")));
}

export async function listMediaStorageKeysForAccount(ownerAccountId: string) {
  return db
    .select({ storageKey: mediaAssets.storageKey })
    .from(mediaAssets)
    .where(eq(mediaAssets.ownerAccountId, ownerAccountId));
}
