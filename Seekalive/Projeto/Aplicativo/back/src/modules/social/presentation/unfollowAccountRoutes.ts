import { Router, type IRouter } from "express";
import { requireCsrf } from "../../../security/session";
import { unfollowAccount } from "../application/unfollowAccount";
import { activeAccountId, isAccountId, sendError } from "./routeSupport";

const router: IRouter = Router();

router.delete("/accounts/:accountId/follow", requireCsrf, async (request, response) => {
  const actorId = await activeAccountId(request, response);
  if (!actorId) return;
  const targetId = typeof request.params.accountId === "string" ? request.params.accountId : "";
  if (!isAccountId(targetId)) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Esta conta não está disponível.");
    return;
  }
  await unfollowAccount(actorId, targetId);
  response.status(204).end();
});

export default router;
