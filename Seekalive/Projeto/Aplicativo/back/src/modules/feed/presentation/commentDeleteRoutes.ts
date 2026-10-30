import { Router, type IRouter } from "express";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import type { DeletePostComment } from "../application/deletePostComment";
import { isFeedResourceId, requiredActorId, sendFeedError } from "./feedHttp";

export function createCommentDeleteRoutes(
  deleteComment: DeletePostComment,
): IRouter {
  const router: IRouter = Router();

  router.delete(
    "/comments/:commentId",
    createAuthRateLimit("feed-comment-delete", 30, 60_000),
    requireCsrf,
    async (request, response) => {
      const accountId = await requiredActorId(request, response);
      if (!accountId) return;
      const commentId = request.params.commentId;
      if (!isFeedResourceId(commentId)) {
        sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Este comentário não está disponível.");
        return;
      }
      if (!(await deleteComment(commentId, accountId))) {
        sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Este comentário não está disponível.");
        return;
      }
      response.status(204).end();
    },
  );

  return router;
}
