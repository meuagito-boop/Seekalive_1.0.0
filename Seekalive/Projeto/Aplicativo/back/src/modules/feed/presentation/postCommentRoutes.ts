import { Router, type IRouter } from "express";
import { CreateSocialPostCommentBody } from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import {
  FeedCommentIdempotencyConflict,
} from "../domain/postInteractions";
import type { CreatePostComment } from "../application/createPostComment";
import type { ListPostComments } from "../application/listPostComments";
import { FeedCommentReplyNotFound } from "../application/createPostComment";
import { parseCommentCursor } from "../application/postInteractionCursors";
import { isFeedResourceId, requiredActorId, sendFeedError } from "./feedHttp";

export function createPostCommentRoutes(
  createComment: CreatePostComment,
  listComments: ListPostComments,
): IRouter {
  const router: IRouter = Router();

  router.get(
    "/posts/:postId/comments",
    createAuthRateLimit("feed-comments-read", 120, 60_000),
    async (request, response) => {
      const accountId = await requiredActorId(request, response);
      if (!accountId) return;
      const postId = request.params.postId;
      if (!isFeedResourceId(postId)) {
        sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Esta publicação não está disponível.");
        return;
      }
      const rawLimit = request.query.limit;
      const limit = rawLimit === undefined ? 50 : Number(rawLimit);
      const cursor = parseCommentCursor(request.query.cursor, { postId });
      if (!Number.isInteger(limit) || limit < 1 || limit > 100 || cursor === undefined) {
        sendFeedError(response, 400, "VALIDATION_ERROR", "O limite ou cursor informado é inválido.");
        return;
      }
      const page = await listComments(postId, accountId, limit, cursor);
      if (!page) {
        sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Esta publicação não está disponível.");
        return;
      }
      response.json(page);
    },
  );

  router.post(
    "/posts/:postId/comments",
    createAuthRateLimit("feed-comment-create", 10, 60_000),
    requireCsrf,
    async (request, response) => {
      const accountId = await requiredActorId(request, response);
      if (!accountId) return;
      const postId = request.params.postId;
      if (!isFeedResourceId(postId)) {
        sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Esta publicação não está disponível.");
        return;
      }
      const parsed = CreateSocialPostCommentBody.safeParse(request.body);
      if (!parsed.success) {
        sendFeedError(response, 422, "CONTENT_VALIDATION_FAILED", "Escreva um comentário válido.");
        return;
      }
      if (parsed.data.authorId && parsed.data.authorId !== accountId) {
        sendFeedError(response, 403, "CONTENT_AUTHOR_MISMATCH", "Só é possível comentar na própria conta.");
        return;
      }
      const normalizedText = parsed.data.text.trim();
      if (!normalizedText) {
        sendFeedError(response, 422, "CONTENT_VALIDATION_FAILED", "Escreva um comentário antes de enviar.");
        return;
      }
      try {
        const comment = await createComment({
          postId,
          authorId: accountId,
          idempotencyKey: parsed.data.idempotencyKey,
          replyToCommentId: parsed.data.replyToCommentId ?? null,
          content: normalizedText,
        });
        if (!comment) {
          sendFeedError(response, 404, "CONTENT_NOT_FOUND", "Esta publicação não está disponível.");
          return;
        }
        response.status(201).json(comment);
      } catch (error) {
        if (error instanceof FeedCommentReplyNotFound) {
          sendFeedError(response, 422, "CONTENT_VALIDATION_FAILED", "A resposta deve apontar para um comentário desta publicação.");
          return;
        }
        if (error instanceof FeedCommentIdempotencyConflict) {
          sendFeedError(response, 409, "CONTENT_IDEMPOTENCY_CONFLICT", "A chave desta tentativa já foi usada para outro comentário.");
          return;
        }
        throw error;
      }
    },
  );

  return router;
}
