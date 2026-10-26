import { Router, type IRouter } from "express";
import { createAuthRateLimit } from "../../../security/request-origin";
import { readArticle } from "../application/readArticle";
import { isFeedResourceId, optionalViewerId, sendFeedError } from "./feedHttp";

const router: IRouter = Router();

router.get(
  "/articles/:postId",
  createAuthRateLimit("feed-article-read", 120, 60_000),
  async (request, response) => {
    const postId = request.params.postId;
    if (!isFeedResourceId(postId)) {
      sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Este artigo não está disponível.");
      return;
    }

    const viewerId = await optionalViewerId(request);
    const article = await readArticle(postId, viewerId);
    if (!article) {
      sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Este artigo não está disponível.");
      return;
    }
    response.json(article);
  },
);

export default router;
