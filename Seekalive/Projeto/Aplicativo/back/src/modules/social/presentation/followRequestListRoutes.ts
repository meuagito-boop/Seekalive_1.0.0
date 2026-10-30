import { Router, type IRouter } from "express";
import type { RelationshipListOperations } from "../application/relationshipListQueries";
import {
  activeAccountId,
  pageResult,
  parsePage,
  sendError,
} from "./routeSupport";

export function createFollowRequestListRoutes(
  incomingFollowRequestViews: RelationshipListOperations<{
    id: string;
  }>["incomingFollowRequestViews"],
): IRouter {
  const router: IRouter = Router();

  router.get("/follow-requests", async (request, response) => {
    const actorId = await activeAccountId(request, response);
    if (!actorId) return;
    const page = parsePage(request);
    if (!page) {
      sendError(
        response,
        400,
        "VALIDATION_ERROR",
        "O limite ou cursor da página é inválido.",
      );
      return;
    }
    const result = await incomingFollowRequestViews(actorId, page);
    response.json(
      pageResult(result.items, page.limit, page.offset, result.hasMore),
    );
  });

  return router;
}
