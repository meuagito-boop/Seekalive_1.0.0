import { Router, type IRouter } from "express";
import {
  createTextPostSchema,
  HASHTAG_LIMIT_MESSAGE,
} from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import type { CreatePost } from "../application/createPost";
import { toPostView } from "../application/postView";
import { FeedMediaAssetsUnavailableError } from "../domain/feedMediaAssets";
import { FeedHashtagLimitExceededError } from "../domain/postTags";
import { FeedReferencedPostUnavailableError } from "../domain/feedReferences";
import { requiredActorId, sendFeedError } from "./feedHttp";

export function createPostCreateRoutes(createPost: CreatePost): IRouter {
  const router: IRouter = Router();

  router.post(
    "/posts",
    createAuthRateLimit("feed-post-create", 20, 60_000),
    requireCsrf,
    async (request, response) => {
      const actorId = await requiredActorId(request, response);
      if (!actorId) return;

      const parsed = createTextPostSchema.safeParse(request.body);
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
            : "Revise o texto e a audiência da publicação.",
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
          format: parsed.data.format ?? "text",
          mediaAssetIds: parsed.data.mediaAssetIds,
          reference: parsed.data.reference,
        });
      } catch (error) {
        if (error instanceof FeedReferencedPostUnavailableError) {
          sendFeedError(
            response,
            404,
            "CONTENT_NOT_FOUND",
            "O conteúdo anexado não está disponível.",
          );
          return;
        }
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
