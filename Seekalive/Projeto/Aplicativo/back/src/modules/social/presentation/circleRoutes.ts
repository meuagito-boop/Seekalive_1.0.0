import { Router, type IRouter } from "express";
import type { RelationshipListOperations } from "../application/relationshipListQueries";
import {
  activeAccountId,
  pageResult,
  parsePage,
  sendError,
} from "./routeSupport";

export function createCircleRoutes(
  circleAccountViews: RelationshipListOperations<{
    id: string;
  }>["circleAccountViews"],
): IRouter {
  const router: IRouter = Router();

  router.get("/circles", async (request, response) => {
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
    const items = await circleAccountViews(actorId, page);
    response.json(pageResult(items, page.limit, page.offset));
  });

  return router;
}
