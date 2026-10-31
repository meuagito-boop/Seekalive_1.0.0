import type { Readable } from "node:stream";
import {
  createMediaAssetId,
  MEDIA_ASSET_LIMITS,
  type MediaFileStore,
  type MediaType,
} from "../domain/mediaAsset";
import type { StagedMediaAsset } from "../domain/mediaAsset";

type UploadMediaDependencies = {
  store: MediaFileStore;
  insertStagedAsset: (input: {
    id: string;
    ownerAccountId: string;
    storageKey: string;
    type: "image" | "video";
    contentType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "image/avif" | "video/mp4" | "video/webm";
    sizeBytes: number;
    expiresAt: Date;
  }) => Promise<StagedMediaAsset>;
  listExpiredAssets: (now: Date) => Promise<Array<{ id: string; storageKey: string }>>;
  deleteExpiredAsset: (id: string, now: Date) => Promise<void>;
};

export function createMediaUploader(dependencies: UploadMediaDependencies) {
  return async function uploadMedia(
    ownerAccountId: string,
    source: Readable,
    declaredType: MediaType,
  ) {
    const now = new Date();
    const expired = await dependencies.listExpiredAssets(now);
    for (const asset of expired) {
      try {
        await dependencies.store.remove(asset.storageKey);
        await dependencies.deleteExpiredAsset(asset.id, now);
      } catch (error) {
        console.warn(JSON.stringify({
          event: "media.expired_asset_cleanup_failed",
          assetId: asset.id,
          error: error instanceof Error ? error.name : "UnknownError",
        }));
      }
    }

    const stored = await dependencies.store.writeUpload(
      source,
      declaredType,
    );
    const assetId = createMediaAssetId();
    const expiresAt = new Date(now.getTime() + MEDIA_ASSET_LIMITS.stagedLifetimeMs);

    try {
      await dependencies.insertStagedAsset({
        id: assetId,
        ownerAccountId,
        storageKey: stored.storageKey,
        type: stored.type,
        contentType: stored.contentType,
        sizeBytes: stored.sizeBytes,
        expiresAt,
      });
    } catch (error) {
      await dependencies.store.remove(stored.storageKey).catch(() => undefined);
      throw error;
    }

    return {
      id: assetId,
      type: stored.type,
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
      url: `/api/v1/social/media/${assetId}`,
      expiresAt: expiresAt.toISOString(),
    };
  };
}
