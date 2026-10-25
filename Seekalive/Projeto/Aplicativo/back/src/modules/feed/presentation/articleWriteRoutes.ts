import { Router, type IRouter } from "express";
import { createArticleSchema } from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../security/request-origin";
import { requireCsrf } from "../../../security/session";
import { createPost } from "../application/createPost";
import { toPostView } from "../application/postView";
import { requiredActorId, sendFeedError } from "./feedHttp";

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
      sendFeedError(response, 422, "CONTENT_VALIDATION_FAILED", "Informe título, texto do artigo e audiência válidos.");
      return;
    }
    if (parsed.data.authorId && parsed.data.authorId !== actorId) {
      sendFeedError(response, 403, "CONTENT_AUTHOR_MISMATCH", "Só é possível publicar na própria conta.");
      return;
    }

    const post = await createPost({
      authorId: actorId,
      content: parsed.data.content,
      audience: parsed.data.audience,
      format: "article",
      articleTitle: parsed.data.article.title,
      articleBody: parsed.data.article.body,
    });
    response.status(201).json(toPostView(post, actorId));
  },
);

export default router;
