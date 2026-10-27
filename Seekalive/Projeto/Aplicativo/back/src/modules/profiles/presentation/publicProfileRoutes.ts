import { Router, type IRouter, type Request, type Response } from "express";
import { loadActiveSession } from "../../../security/session";
import type {
  PublicAccountByIdQuery,
  PublicProfileByUsernameQuery,
} from "../application/publicProfile";
import { sendError } from "./routeSupport";

export function createPublicProfileRouter(
  getPublicProfileByUsername: PublicProfileByUsernameQuery,
  getPublicAccountById: PublicAccountByIdQuery,
): IRouter {
  const router: IRouter = Router();

  router.get("/profiles/:username", async (request, response) => {
    const username =
      typeof request.params.username === "string"
        ? request.params.username.toLowerCase()
        : "";
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      sendError(
        response,
        404,
        "ACCOUNT_NOT_FOUND",
        "Este perfil não está disponível.",
      );
      return;
    }
    const session = await loadActiveSession(request);
    const profile = await getPublicProfileByUsername(
      username,
      session?.accountId ?? null,
    );
    if (profile.kind === "not_found") {
      sendError(
        response,
        404,
        "ACCOUNT_NOT_FOUND",
        "Este perfil não está disponível.",
      );
      return;
    }
    response.json(profile.data);
  });

  router.get("/accounts/:accountId", async (request, response) => {
    const accountId =
      typeof request.params.accountId === "string"
        ? request.params.accountId
        : "";
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        accountId,
      )
    ) {
      sendError(
        response,
        404,
        "ACCOUNT_NOT_FOUND",
        "Este perfil não está disponível.",
      );
      return;
    }
    const session = await loadActiveSession(request);
    const profile = await getPublicAccountById(
      accountId,
      session?.accountId ?? null,
    );
    if (profile.kind === "not_found") {
      sendError(
        response,
        404,
        "ACCOUNT_NOT_FOUND",
        "Este perfil não está disponível.",
      );
      return;
    }
    response.json(profile.data);
  });

  return router;
}
