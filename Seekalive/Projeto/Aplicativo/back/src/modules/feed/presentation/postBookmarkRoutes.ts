import { Router, type IRouter, type Request, type Response } from "express";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import { isFeedResourceId, requiredActorId, sendFeedError } from "./feedHttp";

type SetPostBookmark = (
  postId: string,
  accountId: string,
  bookmarked: boolean,
) => Promise<unknown | null>;

export function createPostBookmarkRoutes(
  setPostBookmark: SetPostBookmark,
): IRouter {
  const router: IRouter = Router();

  async function updateBookmark(
    request: Request,
    response: Response,
    bookmarked: boolean,
  ) {
    const accountId = await requiredActorId(request, response);
    if (!accountId) return;
    const postId = request.params.postId;
    if (!isFeedResourceId(postId)) {
      sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Esta publicação não está disponível.");
      return;
    }
    const post = await setPostBookmark(postId, accountId, bookmarked);
    if (!post) {
      sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Esta publicação não está disponível.");
      return;
    }
    response.status(200).json(post);
  }

  router.put(
    "/posts/:postId/bookmark",
    createAuthRateLimit("feed-post-bookmark", 60, 60_000),
    requireCsrf,
    (request, response) => updateBookmark(request, response, true),
  );
  router.delete(
    "/posts/:postId/bookmark",
    createAuthRateLimit("feed-post-unbookmark", 60, 60_000),
    requireCsrf,
    (request, response) => updateBookmark(request, response, false),
  );

  return router;
}
