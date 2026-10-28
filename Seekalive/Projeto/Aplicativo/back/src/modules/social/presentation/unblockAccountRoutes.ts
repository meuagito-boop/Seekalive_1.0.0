import { Router, type IRouter } from "express";
import { requireCsrf } from "../../../security/csrf";
import { unblockAccount } from "../composition/publicApi";
import { activeAccountId, isAccountId, sendError } from "./routeSupport";

const router: IRouter = Router();

router.delete("/blocks/:accountId", requireCsrf, async (request, response) => {
  const actorId = await activeAccountId(request, response);
  if (!actorId) return;
  const targetId =
    typeof request.params.accountId === "string"
      ? request.params.accountId
      : "";
  if (!isAccountId(targetId)) {
    sendError(
      response,
      404,
      "ACCOUNT_NOT_FOUND",
      "Esta conta não está disponível.",
    );
    return;
  }
  await unblockAccount(actorId, targetId);
  response.status(204).end();
});

export default router;
