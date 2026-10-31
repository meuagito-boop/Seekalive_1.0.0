import { and, eq } from "drizzle-orm";
import {
  db,
  feedPosts,
  type DatabaseTransaction,
} from "@workspace/db";
import { attachStagedMediaAssets, findStagedMediaAssets } from "../../media/infrastructure/mediaAssetRepository";
import { deleteMediaAssetsForPost } from "../../media/infrastructure/mediaAssetRepository";
import { localMediaFileStore } from "../../media/infrastructure/localMediaFileStore";
import type { NewFeedPost, FeedMediaReference } from "../domain/post";
import { FeedMediaAssetsUnavailableError } from "../domain/feedMediaAssets";
import { toFeedPost } from "../infrastructure/postRepository";
import { persistPostHashtags } from "../infrastructure/postTagRepository";

export type PersistFeedPostCommand = NewFeedPost & {
  mediaAssetIds?: string[];
};

export async function persistFeedPost(
  command: PersistFeedPostCommand,
) {
  const assetIds = command.mediaAssetIds ?? [];
  if (
    assetIds.length > 8 ||
    new Set(assetIds).size !== assetIds.length ||
    assetIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))
  ) {
    throw new FeedMediaAssetsUnavailableError();
  }

  return db.transaction(async (transaction: DatabaseTransaction) => {
    const stagedAssets = await findStagedMediaAssets(transaction, {
      ownerAccountId: command.authorId,
      assetIds,
      now: new Date(),
    });
    if (stagedAssets.some((asset) => asset === null)) {
      throw new FeedMediaAssetsUnavailableError();
    }

    const media: FeedMediaReference[] = stagedAssets.map((asset) => ({
      id: asset!.id,
      type: asset!.mediaType,
    }));
    const [row] = await transaction
      .insert(feedPosts)
      .values({
        authorId: command.authorId,
        content: command.content,
        audience: command.audience,
        format: command.format,
        articleTitle: command.articleTitle ?? null,
        articleBody: command.articleBody ?? null,
        media,
      })
      .returning();
    if (!row) throw new Error("Feed post insert returned no row.");
    await persistPostHashtags(transaction, row.id, [
      command.content,
      command.articleTitle,
      command.articleBody,
    ]);

    if (assetIds.length > 0) {
      await attachStagedMediaAssets(transaction, {
        ownerAccountId: command.authorId,
        postId: row.id,
        assetIds,
      });
    }
    return toFeedPost(row);
  });
}

export async function deleteFeedPostWithMedia(
  postId: string,
  actorId: string,
): Promise<boolean> {
  const deletion = await db.transaction(async (transaction) => {
    const [ownedPost] = await transaction
      .select({ id: feedPosts.id })
      .from(feedPosts)
      .where(and(eq(feedPosts.id, postId), eq(feedPosts.authorId, actorId)))
      .for("update")
      .limit(1);
    if (!ownedPost) return { deleted: false, storageKeys: [] as string[] };

    const assets = await deleteMediaAssetsForPost(transaction, postId);
    const deleted = await transaction
      .delete(feedPosts)
      .where(and(eq(feedPosts.id, postId), eq(feedPosts.authorId, actorId)))
      .returning({ id: feedPosts.id });
    return {
      deleted: deleted.length > 0,
      storageKeys: assets.map((asset) => asset.storageKey),
    };
  });
  if (!deletion.deleted) return false;

  for (const storageKey of deletion.storageKeys) {
    try {
      await localMediaFileStore.remove(storageKey);
    } catch (error) {
      console.warn(JSON.stringify({
        event: "media.deleted_post_file_cleanup_failed",
        postId,
        error: error instanceof Error ? error.name : "UnknownError",
      }));
    }
  }
  return true;
}
