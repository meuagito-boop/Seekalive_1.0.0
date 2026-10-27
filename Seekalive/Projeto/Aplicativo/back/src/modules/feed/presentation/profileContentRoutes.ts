import { Router, type IRouter } from "express";
import { createAuthRateLimit } from "../../../security/request-origin";
import type { ListProfilePosts } from "../application/listProfilePosts";
import { parsePostCursor } from "../application/postCursor";
import { isFeedResourceId, optionalViewerId, sendFeedError } from "./feedHttp";

export function createProfileContentRoutes(
  listProfilePosts: ListProfilePosts,
): IRouter {
  const router: IRouter = Router();

  router.get(
    "/accounts/:accountId/posts",
    createAuthRateLimit("feed-profile-content", 120, 60_000),
    async (request, response) => {
      const accountId = request.params.accountId;
      if (!isFeedResourceId(accountId)) {
        sendFeedError(
          response,
          404,
          "ACCOUNT_NOT_FOUND",
          "Este perfil não está disponível.",
        );
        return;
      }

      const rawLimit = request.query.limit;
      const limit = rawLimit === undefined ? 20 : Number(rawLimit);
      const rawFormat = request.query.format;
      const format = rawFormat === undefined ? "all" : rawFormat;
      const cursor =
        format === "all" || format === "text" || format === "article"
          ? parsePostCursor(request.query.cursor, {
              authorId: accountId,
              format,
            })
          : undefined;
      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 100 ||
        cursor === undefined ||
        (format !== "all" && format !== "text" && format !== "article")
      ) {
        sendFeedError(
          response,
          400,
          "VALIDATION_ERROR",
          "O limite, formato ou cursor informado é inválido.",
        );
        return;
      }

      const viewerId = await optionalViewerId(request);
      const page = await listProfilePosts(
        accountId,
        viewerId,
        limit,
        cursor,
        format,
      );
      if (!page) {
        sendFeedError(
          response,
          404,
          "ACCOUNT_NOT_FOUND",
          "Este perfil não está disponível.",
        );
        return;
      }
      response.json(page);
    },
  );

  return router;
}
