import { Router, type IRouter } from "express";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import type { DeletePost } from "../application/deletePost";
import { isFeedResourceId, requiredActorId, sendFeedError } from "./feedHttp";

export function createPostDeleteRoutes(deletePost: DeletePost): IRouter {
  const router: IRouter = Router();

  router.delete(
    "/posts/:postId",
    createAuthRateLimit("feed-post-delete", 30, 60_000),
    requireCsrf,
    async (request, response) => {
      const actorId = await requiredActorId(request, response);
      if (!actorId) return;
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
      if (!(await deletePost(postId, actorId))) {
        sendFeedError(
          response,
          404,
          "CONTENT_NOT_FOUND",
          "Esta publicação não está disponível.",
        );
        return;
      }
      response.status(204).end();
    },
  );

  return router;
}
