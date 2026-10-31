import { Router, type IRouter } from "express";
import { createAuthRateLimit } from "../../../security/rateLimit";
import type { ReadPostReferencePreview } from "../application/readPostReferencePreview";
import { isFeedResourceId, optionalViewerId, sendFeedError } from "./feedHttp";

export function createPostReferencePreviewRoutes(
  readPreview: ReadPostReferencePreview,
): IRouter {
  const router: IRouter = Router();

  router.get(
    "/posts/:postId/reference",
    createAuthRateLimit("feed-post-reference-read", 120, 60_000),
    async (request, response) => {
      const postId = request.params.postId;
      if (!isFeedResourceId(postId)) {
        sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Conteúdo indisponível.");
        return;
      }

      const viewerId = await optionalViewerId(request);
      const preview = await readPreview(postId, viewerId);
      if (!preview) {
        sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Conteúdo indisponível.");
        return;
      }
      response.json(preview);
    },
  );

  return router;
}
