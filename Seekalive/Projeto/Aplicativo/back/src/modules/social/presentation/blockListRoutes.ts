import { Router, type IRouter } from "express";
import type { RelationshipListOperations } from "../application/relationshipListQueries";
import { activeAccountId } from "./routeSupport";

export function createBlockListRoutes(
  blockedAccountViews: RelationshipListOperations<{
    id: string;
  }>["blockedAccountViews"],
): IRouter {
  const router: IRouter = Router();

  router.get("/blocks", async (request, response) => {
    const actorId = await activeAccountId(request, response);
    if (!actorId) return;
    const items = await blockedAccountViews(actorId);
    response.json({ items, nextCursor: null });
  });

  return router;
}
