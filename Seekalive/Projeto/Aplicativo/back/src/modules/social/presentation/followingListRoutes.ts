import { Router, type IRouter } from "express";
import type { createResolveRelationshipListTarget } from "../application/resolveRelationshipListTarget";
import type { RelationshipListOperations } from "../application/relationshipListQueries";
import { isAccountId, pageResult, parsePage, sendError } from "./routeSupport";
import { requireVisibleRelationshipTarget } from "./relationshipListSupport";

export function createFollowingListRoutes(
  followingAccountViews: RelationshipListOperations<{
    id: string;
  }>["followingAccountViews"],
  resolveRelationshipListTarget: ReturnType<
    typeof createResolveRelationshipListTarget
  >,
): IRouter {
  const router: IRouter = Router();

  router.get("/accounts/:accountId/following", async (request, response) => {
    const accountId =
      typeof request.params.accountId === "string"
        ? request.params.accountId
        : "";
    if (!isAccountId(accountId)) {
      sendError(
        response,
        404,
        "ACCOUNT_NOT_FOUND",
        "Esta conta não está disponível.",
      );
      return;
    }
    const target = await requireVisibleRelationshipTarget(
      request,
      response,
      accountId,
      resolveRelationshipListTarget,
    );
    if (!target) return;
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
    const items = await followingAccountViews(accountId, target.viewerId, page);
    response.json(pageResult(items, page.limit, page.offset));
  });

  return router;
}
