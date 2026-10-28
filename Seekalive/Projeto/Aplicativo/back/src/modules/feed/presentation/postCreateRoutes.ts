import { Router, type IRouter } from "express";
import { createTextPostSchema } from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import type { CreatePost } from "../application/createPost";
import { toPostView } from "../application/postView";
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

      const body = request.body as Record<string, unknown> | null;
      if (
        body &&
        typeof body === "object" &&
        (body.format === "media" ||
          (Array.isArray(body.mediaUrls) && body.mediaUrls.length > 0) ||
          (Array.isArray(body.mediaTypes) && body.mediaTypes.length > 0))
      ) {
        sendFeedError(
          response,
          422,
          "CONTENT_MEDIA_NOT_READY",
          "Publicação com mídia ficará disponível após a integração segura de armazenamento.",
        );
        return;
      }

      const parsed = createTextPostSchema.safeParse(request.body);
      if (!parsed.success) {
        sendFeedError(
          response,
          422,
          "CONTENT_VALIDATION_FAILED",
          "Revise o texto e a audiência da publicação.",
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

      const post = await createPost({
        authorId: actorId,
        content: parsed.data.content,
        audience: parsed.data.audience,
        format: "text",
      });
      response.status(201).json(toPostView(post));
    },
  );

  return router;
}
