import { Router, type IRouter } from "express";
import { createAuthRateLimit } from "../../../security/rateLimit";
import type { ReadPost } from "../application/readPost";
import { isFeedResourceId, optionalViewerId, sendFeedError } from "./feedHttp";

export function createPostReadRoutes(readPost: ReadPost): IRouter {
  const router: IRouter = Router();

  router.get(
    "/posts/:postId",
    createAuthRateLimit("feed-post-read", 120, 60_000),
    async (request, response) => {
      const postId = request.params.postId;
      if (!isFeedResourceId(postId)) {
        sendFeedError(
          response,
          404,
          "CONTENT_NOT_FOUND",
          "Esta publicação não está disponível.",
        );
        return;
      }

      const viewerId = await optionalViewerId(request);
      const post = await readPost(postId, viewerId);
      if (!post) {
        sendFeedError(
          response,
          404,
          "CONTENT_NOT_FOUND",
          "Esta publicação não está disponível.",
        );
        return;
      }
      response.json(post);
    },
  );

  return router;
}
