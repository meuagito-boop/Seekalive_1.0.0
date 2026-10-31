import { Router, type IRouter } from "express";
import {
  businessProfileReviewReplySchema,
  createBusinessProfileReviewSchema,
  usernameFormatSchema,
} from "@workspace/api-zod";
import { sendApiValidationError } from "../../../common/apiErrors";
import { loadActiveSession } from "../../../security/activeSession";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import type { BusinessProfileReviewError } from "../application/businessProfileReviews";
import type { createBusinessProfileReviewService } from "../application/businessProfileReviews";
import type { BusinessProfileReviewPosition } from "../application/businessProfileReviewCursor";
import { activeAccountId, sendError } from "./routeSupport";

type ReviewService = ReturnType<typeof createBusinessProfileReviewService>;
type ReviewCursorDecoder = (
  value: string,
) => BusinessProfileReviewPosition | null;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isReviewError(error: unknown): error is BusinessProfileReviewError {
  return (
    error instanceof Error &&
    error.name === "BusinessProfileReviewError" &&
    "kind" in error
  );
}

function sendReviewError(
  response: Parameters<typeof sendError>[0],
  error: BusinessProfileReviewError,
): void {
  switch (error.kind) {
    case "not_found":
    case "reviewer_not_found":
      sendError(
        response,
        404,
        "BUSINESS_REVIEW_NOT_FOUND",
        "Este perfil ou avaliação não está disponível.",
      );
      return;
    case "not_allowed":
      sendError(
        response,
        403,
        "BUSINESS_REVIEW_NOT_ALLOWED",
        "Esta conta não pode realizar esta ação.",
      );
      return;
    case "already_exists":
      sendError(
        response,
        409,
        "BUSINESS_REVIEW_ALREADY_EXISTS",
        "Esta conta já publicou uma avaliação para este perfil. Exclua a avaliação anterior antes de publicar outra.",
      );
      return;
  }
}

function readUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = usernameFormatSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function createBusinessProfileReviewRouter(
  reviews: ReviewService,
  decodeCursor: ReviewCursorDecoder,
): IRouter {
  const router: IRouter = Router();

  router.get("/profiles/:username/reviews", async (request, response) => {
    const username = readUsername(request.params.username);
    if (!username) {
      sendError(
        response,
        404,
        "BUSINESS_REVIEW_NOT_FOUND",
        "Este perfil não está disponível.",
      );
      return;
    }

    const rawLimit = request.query.limit;
    const limit =
      rawLimit === undefined
        ? 20
        : typeof rawLimit === "string"
          ? Number(rawLimit)
          : Number.NaN;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      sendError(
        response,
        400,
        "INVALID_REQUEST",
        "O limite deve ser um número entre 1 e 50.",
      );
      return;
    }

    const rawCursor = request.query.cursor;
    const encodedCursor =
      rawCursor === undefined
        ? null
        : typeof rawCursor === "string" && rawCursor.length <= 256
          ? rawCursor
          : null;
    const cursor = encodedCursor ? decodeCursor(encodedCursor) : null;
    if (rawCursor !== undefined && !cursor) {
      sendError(
        response,
        400,
        "INVALID_REQUEST",
        "O cursor da página é inválido.",
      );
      return;
    }

    const session = await loadActiveSession(request);
    const page = await reviews.list(
      username,
      session?.accountId ?? null,
      cursor,
      limit,
    );
    if (!page) {
      sendError(
        response,
        404,
        "BUSINESS_REVIEW_NOT_FOUND",
        "Este perfil não está disponível.",
      );
      return;
    }
    response.json(page);
  });

  router.post(
    "/profiles/:username/reviews",
    createAuthRateLimit("business-profile-review-create", 30, 60_000),
    requireCsrf,
    async (request, response) => {
      const accountId = await activeAccountId(request, response);
      if (!accountId) return;
      const username = readUsername(request.params.username);
      if (!username) {
        sendError(
          response,
          404,
          "BUSINESS_REVIEW_NOT_FOUND",
          "Este perfil não está disponível.",
        );
        return;
      }
      const parsed = createBusinessProfileReviewSchema.safeParse(request.body);
      if (!parsed.success) {
        sendApiValidationError(
          response,
          parsed.error.issues,
          "A avaliação precisa ter uma nota de 1 a 5 e um comentário de 10 a 500 caracteres.",
        );
        return;
      }
      try {
        const created = await reviews.create(username, accountId, parsed.data);
        response.status(201).json({
          id: created.id,
          businessAccountId: created.businessAccountId,
          reviewerAccountId: created.reviewerAccountId,
          createdAt: created.createdAt.toISOString(),
        });
      } catch (error) {
        if (isReviewError(error)) {
          sendReviewError(response, error);
          return;
        }
        throw error;
      }
    },
  );

  router.delete(
    "/profiles/:username/reviews/me",
    createAuthRateLimit("business-profile-review-delete", 30, 60_000),
    requireCsrf,
    async (request, response) => {
      const accountId = await activeAccountId(request, response);
      if (!accountId) return;
      const username = readUsername(request.params.username);
      if (!username) {
        sendError(
          response,
          404,
          "BUSINESS_REVIEW_NOT_FOUND",
          "Este perfil ou avaliação não está disponível.",
        );
        return;
      }
      const deleted = await reviews.deleteOwn(username, accountId);
      if (!deleted) {
        sendError(
          response,
          404,
          "BUSINESS_REVIEW_NOT_FOUND",
          "Este perfil ou avaliação não está disponível.",
        );
        return;
      }
      response.json({ deleted: true });
    },
  );

  router.put(
    "/profiles/:username/reviews/:reviewId/reply",
    createAuthRateLimit("business-profile-review-reply", 30, 60_000),
    requireCsrf,
    async (request, response) => {
      const accountId = await activeAccountId(request, response);
      if (!accountId) return;
      const username = readUsername(request.params.username);
      const reviewId =
        typeof request.params.reviewId === "string"
          ? request.params.reviewId
          : "";
      if (!username || !UUID_PATTERN.test(reviewId)) {
        sendError(
          response,
          404,
          "BUSINESS_REVIEW_NOT_FOUND",
          "Este perfil ou avaliação não está disponível.",
        );
        return;
      }
      const parsed = businessProfileReviewReplySchema.safeParse(request.body);
      if (!parsed.success) {
        sendApiValidationError(
          response,
          parsed.error.issues,
          "A resposta precisa ter entre 3 e 500 caracteres.",
        );
        return;
      }
      try {
        const updated = await reviews.reply(
          username,
          accountId,
          parsed.data,
          reviewId,
        );
        if (!updated) {
          sendError(
            response,
            404,
            "BUSINESS_REVIEW_NOT_FOUND",
            "Este perfil ou avaliação não está disponível.",
          );
          return;
        }
        response.json({
          id: updated.id,
          businessAccountId: updated.businessAccountId,
          businessReply: updated.businessReply,
          businessRepliedAt: updated.businessRepliedAt?.toISOString() ?? null,
        });
      } catch (error) {
        if (isReviewError(error)) {
          sendReviewError(response, error);
          return;
        }
        throw error;
      }
    },
  );

  return router;
}
