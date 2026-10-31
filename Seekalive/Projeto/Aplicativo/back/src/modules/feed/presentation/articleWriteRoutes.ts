import { Router, type IRouter } from "express";
import {
  createArticleSchema,
  HASHTAG_LIMIT_MESSAGE,
} from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import type { CreatePost } from "../application/createPost";
import { toPostView } from "../application/postView";
import { FeedMediaAssetsUnavailableError } from "../domain/feedMediaAssets";
import { FeedHashtagLimitExceededError } from "../domain/postTags";
import { requiredActorId, sendFeedError } from "./feedHttp";

export function createArticleWriteRoutes(createPost: CreatePost): IRouter {
  const router: IRouter = Router();

  router.post(
    "/articles",
    createAuthRateLimit("feed-article-create", 10, 60_000),
    requireCsrf,
    async (request, response) => {
      const actorId = await requiredActorId(request, response);
      if (!actorId) return;

      const parsed = createArticleSchema.safeParse(request.body);
      if (!parsed.success) {
        const hashtagLimitExceeded = parsed.error.issues.some(
          (issue) => issue.message === HASHTAG_LIMIT_MESSAGE,
        );
        sendFeedError(
          response,
          422,
          "CONTENT_VALIDATION_FAILED",
          hashtagLimitExceeded
            ? HASHTAG_LIMIT_MESSAGE
            : "Informe título, texto do artigo e audiência válidos.",
        );
        return;
      }
      if (parsed.data.authorId && parsed.data.authorId !== actorId) {
        sendFeedError(
          response,
          403,
          "CONTENT_AUTHOR_MISMATCH",
          "Só é possível publicar na própria conta.",
        );
        return;
      }

      let post;
      try {
        post = await createPost({
          authorId: actorId,
          content: parsed.data.content,
          audience: parsed.data.audience,
          format: "article",
          articleTitle: parsed.data.article.title,
          articleBody: parsed.data.article.body,
          mediaAssetIds: parsed.data.mediaAssetIds,
        });
      } catch (error) {
        if (error instanceof FeedHashtagLimitExceededError) {
          sendFeedError(
            response,
            422,
            "CONTENT_VALIDATION_FAILED",
            HASHTAG_LIMIT_MESSAGE,
          );
          return;
        }
        if (!(error instanceof FeedMediaAssetsUnavailableError)) throw error;
        sendFeedError(
          response,
          422,
          "CONTENT_VALIDATION_FAILED",
          "Uma ou mais mídias não estão disponíveis. Envie-as novamente.",
        );
        return;
      }
      response.status(201).json(toPostView(post));
    },
  );

  return router;
}
