import { Router, type IRouter } from "express";
import { requireCsrf } from "../../../security/csrf";
import type { createDeclineFollowRequest } from "../application/declineFollowRequest";
import { activeAccountId, isAccountId, sendError } from "./routeSupport";

export function createDeclineFollowRequestRoutes(
  declineFollowRequest: ReturnType<typeof createDeclineFollowRequest>,
): IRouter {
  const router: IRouter = Router();

  router.post(
    "/follow-requests/:accountId/decline",
    requireCsrf,
    async (request, response) => {
      const actorId = await activeAccountId(request, response);
      if (!actorId) return;
      const requesterId =
        typeof request.params.accountId === "string"
          ? request.params.accountId
          : "";
      if (!isAccountId(requesterId)) {
        sendError(
          response,
          404,
          "FOLLOW_REQUEST_NOT_FOUND",
          "Solicitação não encontrada.",
        );
        return;
      }
      await declineFollowRequest(actorId, requesterId);
      response.status(204).end();
    },
  );

  return router;
}
