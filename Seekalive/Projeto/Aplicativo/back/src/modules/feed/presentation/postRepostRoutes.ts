import { Router, type IRouter, type Request, type Response } from "express";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import { isFeedResourceId, requiredActorId, sendFeedError } from "./feedHttp";

type SetPostRepost = (
  postId: string,
  accountId: string,
  reposted: boolean,
) => Promise<unknown | null>;

export function createPostRepostRoutes(setPostRepost: SetPostRepost): IRouter {
  const router: IRouter = Router();

  async function updateRepost(
    request: Request,
    response: Response,
    reposted: boolean,
  ) {
    const accountId = await requiredActorId(request, response);
    if (!accountId) return;
    const postId = request.params.postId;
    if (!isFeedResourceId(postId)) {
      sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Esta publicação não está disponível.");
      return;
    }
    const post = await setPostRepost(postId, accountId, reposted);
    if (!post) {
      sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Esta publicação não está disponível.");
      return;
    }
    response.status(200).json(post);
  }

  router.post(
    "/posts/:postId/repost",
    createAuthRateLimit("feed-post-repost", 30, 60_000),
    requireCsrf,
    (request, response) => updateRepost(request, response, true),
  );
  router.delete(
    "/posts/:postId/repost",
    createAuthRateLimit("feed-post-unrepost", 30, 60_000),
    requireCsrf,
    (request, response) => updateRepost(request, response, false),
  );

  return router;
}
