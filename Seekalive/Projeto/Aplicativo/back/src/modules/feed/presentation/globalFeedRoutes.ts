import { Router, type IRouter } from "express";
import type { SocialFeedTab } from "../domain/post";
import type { PostPosition } from "../domain/post";
import { parseGlobalFeedCursor } from "../application/globalFeedCursor";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { optionalViewerId, requiredActorId, sendFeedError } from "./feedHttp";

const feedTabs = new Set<SocialFeedTab>([
  "for-you",
  "following",
  "articles",
  "videos",
]);

type ListGlobalFeed = (input: {
  tab: SocialFeedTab;
  viewerId: string | null;
  searchTerm?: string;
  limit: number;
  cursor: PostPosition | null;
}) => Promise<{
  items: Array<{ post: unknown; author: unknown }>;
  nextCursor: string | null;
}>;

export function createGlobalFeedRoutes(
  listGlobalFeed: ListGlobalFeed,
): IRouter {
  const router: IRouter = Router();

  router.get(
    "/feed",
    createAuthRateLimit("feed-global-list", 120, 60_000),
    async (request, response) => {
      const rawTab = request.query.tab ?? "for-you";
      const rawLimit = request.query.limit;
      const rawSearchTerm = request.query.q;
      const searchTerm =
        typeof rawSearchTerm === "string" ? rawSearchTerm.trim() : undefined;
      const limit = rawLimit === undefined ? 20 : Number(rawLimit);
      if (
        typeof rawTab !== "string" ||
        !feedTabs.has(rawTab as SocialFeedTab) ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 50 ||
        (rawSearchTerm !== undefined &&
          (typeof rawSearchTerm !== "string" ||
            !searchTerm ||
            searchTerm.length < 2 ||
            searchTerm.length > 120))
      ) {
        sendFeedError(
          response,
          400,
          "VALIDATION_ERROR",
          "A aba, o limite ou o cursor informado é inválido.",
        );
        return;
      }

      const tab = rawTab as SocialFeedTab;
      const viewerId =
        tab === "following"
          ? await requiredActorId(request, response)
          : await optionalViewerId(request);
      if (tab === "following" && !viewerId) return;

      const cursor = parseGlobalFeedCursor(request.query.cursor, {
        tab,
        viewerId,
        searchTerm: searchTerm?.toLocaleLowerCase("pt-BR"),
      });
      if (cursor === undefined) {
        sendFeedError(
          response,
          400,
          "VALIDATION_ERROR",
          "A aba, o limite ou o cursor informado é inválido.",
        );
        return;
      }

      response.json(
        await listGlobalFeed({
          tab,
          viewerId,
          searchTerm,
          limit,
          cursor,
        }),
      );
    },
  );

  return router;
}
