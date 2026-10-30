import { Router, type IRouter } from "express";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import type { createBlockAccount } from "../application/blockAccount";
import { activeAccountId, isAccountId, sendError } from "./routeSupport";

export function createBlockAccountRoutes(
  blockAccount: ReturnType<typeof createBlockAccount>,
): IRouter {
  const router: IRouter = Router();

  router.put(
    "/blocks/:accountId",
    createAuthRateLimit("social-block", 30, 60_000),
    requireCsrf,
    async (request, response) => {
      const actorId = await activeAccountId(request, response);
      if (!actorId) return;
      const targetId =
        typeof request.params.accountId === "string"
          ? request.params.accountId
          : "";
      if (!isAccountId(targetId) || actorId === targetId) {
        sendError(
          response,
          404,
          "ACCOUNT_NOT_FOUND",
          "Esta conta não está disponível.",
        );
        return;
      }
      if (!(await blockAccount(actorId, targetId))) {
        sendError(
          response,
          404,
          "ACCOUNT_NOT_FOUND",
          "Esta conta não está disponível.",
        );
        return;
      }
      response.status(204).end();
    },
  );

  return router;
}
