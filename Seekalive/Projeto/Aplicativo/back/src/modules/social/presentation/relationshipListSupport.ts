import type { Request, Response } from "express";
import { loadActiveSession } from "../../../security/activeSession";
import { resolveRelationshipListTarget } from "../composition/relationshipListServices";
import { sendError } from "./routeSupport";

export async function requireVisibleRelationshipTarget(
  request: Request,
  response: Response,
  accountId: string,
): Promise<{ viewerId: string | null } | null> {
  const session = await loadActiveSession(request);
  const result = await resolveRelationshipListTarget(
    session?.accountId ?? null,
    accountId,
  );
  if (result.kind === "not_found") {
    sendError(
      response,
      404,
      "ACCOUNT_NOT_FOUND",
      "Esta conta não está disponível.",
    );
    return null;
  }
  if (result.kind === "private") {
    sendError(
      response,
      403,
      "PRIVATE_PROFILE",
      "A lista não está disponível para este perfil.",
    );
    return null;
  }
  return { viewerId: result.viewerId };
}
