import { Router, type IRouter, type Request, type Response } from "express";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import type { SetCommentLike } from "../application/setCommentLike";
import { isFeedResourceId, requiredActorId, sendFeedError } from "./feedHttp";

export function createCommentLikeRoutes(setCommentLike: SetCommentLike): IRouter {
  const router: IRouter = Router();

  async function updateLike(
    request: Request,
    response: Response,
    liked: boolean,
  ) {
    const accountId = await requiredActorId(request, response);
    if (!accountId) return;
    const commentId = request.params.commentId;
    if (!isFeedResourceId(commentId)) {
      sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Este comentário não está disponível.");
      return;
    }
    const comment = await setCommentLike(commentId, accountId, liked);
    if (!comment) {
      sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Este comentário não está disponível.");
      return;
    }
    response.status(200).json(comment);
  }

  router.put(
    "/comments/:commentId/like",
    createAuthRateLimit("feed-comment-like", 90, 60_000),
    requireCsrf,
    (request, response) => updateLike(request, response, true),
  );
  router.delete(
    "/comments/:commentId/like",
    createAuthRateLimit("feed-comment-unlike", 90, 60_000),
    requireCsrf,
    (request, response) => updateLike(request, response, false),
  );

  return router;
}
