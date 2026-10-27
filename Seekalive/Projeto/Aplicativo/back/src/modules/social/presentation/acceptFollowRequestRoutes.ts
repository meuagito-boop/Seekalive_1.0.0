import { Router, type IRouter } from "express";
import { requireCsrf } from "../../../security/session";
import { acceptFollowRequest } from "../composition/publicApi";
import { activeAccountId, isAccountId, sendError } from "./routeSupport";

const router: IRouter = Router();

router.post("/follow-requests/:accountId/accept", requireCsrf, async (request, response) => {
  const actorId = await activeAccountId(request, response);
  if (!actorId) return;
  const requesterId = typeof request.params.accountId === "string" ? request.params.accountId : "";
  if (!isAccountId(requesterId) || requesterId === actorId) {
    sendError(response, 404, "FOLLOW_REQUEST_NOT_FOUND", "Solicitação não encontrada.");
    return;
  }
  const accepted = await acceptFollowRequest(actorId, requesterId);
  if (!accepted) {
    sendError(response, 404, "FOLLOW_REQUEST_NOT_FOUND", "Solicitação não encontrada.");
    return;
  }
  response.json({ status: "accepted", updatedAt: new Date().toISOString() });
});

export default router;
