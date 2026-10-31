import { Router, type IRouter } from "express";
import { createMediaUploader } from "../application/uploadMedia";
import { localMediaFileStore } from "../infrastructure/localMediaFileStore";
import {
  deleteExpiredStagedMediaAsset,
  deleteOwnedStagedMediaAsset,
  findMediaAssetById,
  insertStagedMediaAsset,
  listExpiredStagedMediaAssets,
} from "../infrastructure/mediaAssetRepository";
import { createMediaRoutes } from "../presentation/mediaRoutes";
import type { ReadPost } from "../../feed/application/readPost";

const uploadMedia = createMediaUploader({
  store: localMediaFileStore,
  insertStagedAsset: insertStagedMediaAsset,
  listExpiredAssets: listExpiredStagedMediaAssets,
  deleteExpiredAsset: deleteExpiredStagedMediaAsset,
});

export function createMediaRouter(readPost: ReadPost): IRouter {
  const router: IRouter = Router();
  router.use(
    createMediaRoutes({
      uploadMedia,
      store: localMediaFileStore,
      findAsset: findMediaAssetById,
      deleteStagedAsset: deleteOwnedStagedMediaAsset,
      readPost,
    }),
  );
  return router;
}
