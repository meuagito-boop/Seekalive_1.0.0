import { Router, type IRouter } from "express";
import { createAuthRateLimit } from "../../../security/request-origin";
import type { UsernameAvailabilityChecker } from "../application/usernameAvailability";
import { sendError } from "./routeSupport";

export function createAccountAvailabilityRouter(
  checkUsernameAvailability: UsernameAvailabilityChecker,
): IRouter {
  const router: IRouter = Router();

  router.get(
    "/accounts/availability",
    createAuthRateLimit("account-availability", 30, 60_000),
    async (request, response) => {
      const result = await checkUsernameAvailability(request.query.username);
      if (result.kind === "invalid") {
        sendError(
          response,
          400,
          "VALIDATION_ERROR",
          "Informe um nome de usuário válido.",
        );
        return;
      }
      response.json({
        available: result.kind === "available",
        normalizedUsername: result.normalizedUsername,
      });
    },
  );

  return router;
}
