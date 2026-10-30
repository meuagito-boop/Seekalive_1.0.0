import { Router, type IRouter, type Request, type Response } from "express";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import { isFeedResourceId, requiredActorId, sendFeedError } from "./feedHttp";

type SetPostLike = (
  postId: string,
  accountId: string,
  liked: boolean,
) => Promise<unknown | null>;

export function createPostLikeRoutes(setPostLike: SetPostLike): IRouter {
  const router: IRouter = Router();

  async function updateLike(
    request: Request,
    response: Response,
    liked: boolean,
  ) {
    const accountId = await requiredActorId(request, response);
    if (!accountId) return;
    const postId = request.params.postId;
    if (!isFeedResourceId(postId)) {
      sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Esta publicação não está disponível.");
      return;
    }
    const post = await setPostLike(postId, accountId, liked);
    if (!post) {
      sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Esta publicação não está disponível.");
      return;
    }
    response.status(200).json(post);
  }

  router.put(
    "/posts/:postId/like",
    createAuthRateLimit("feed-post-like", 90, 60_000),
    requireCsrf,
    (request, response) => updateLike(request, response, true),
  );
  router.delete(
    "/posts/:postId/like",
    createAuthRateLimit("feed-post-unlike", 90, 60_000),
    requireCsrf,
    (request, response) => updateLike(request, response, false),
  );

  return router;
}
