import { Router, type IRouter } from "express";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import { followAccount } from "../composition/publicApi";
import { activeAccountId, isAccountId, sendError } from "./routeSupport";

const router: IRouter = Router();

router.put(
  "/accounts/:accountId/follow",
  createAuthRateLimit("social-follow", 60, 60_000),
  requireCsrf,
  async (request, response) => {
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
    if (actorId === targetId) {
      sendError(
        response,
        400,
        "INVALID_RELATIONSHIP",
        "Não é possível seguir a própria conta.",
      );
      return;
    }
    const result = await followAccount(actorId, targetId);
    if (!result) {
      sendError(
        response,
        404,
        "ACCOUNT_NOT_FOUND",
        "Esta conta não está disponível.",
      );
      return;
    }
    response.json(result);
  },
);

export default router;
