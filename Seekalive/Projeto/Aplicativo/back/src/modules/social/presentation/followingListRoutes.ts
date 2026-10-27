import { Router, type IRouter } from "express";
import { followingAccountViews } from "../composition/relationshipListServices";
import { isAccountId, pageResult, parsePage, sendError } from "./routeSupport";
import { requireVisibleRelationshipTarget } from "./relationshipListSupport";

const router: IRouter = Router();

router.get("/accounts/:accountId/following", async (request, response) => {
  const accountId = typeof request.params.accountId === "string" ? request.params.accountId : "";
  if (!isAccountId(accountId)) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Esta conta não está disponível.");
    return;
  }
  const target = await requireVisibleRelationshipTarget(request, response, accountId);
  if (!target) return;
  const page = parsePage(request);
  if (!page) {
    sendError(response, 400, "VALIDATION_ERROR", "O limite ou cursor da página é inválido.");
    return;
  }
  const items = await followingAccountViews(accountId, target.viewerId, page);
  response.json(pageResult(items, page.limit, page.offset));
});

export default router;
