import type { Request, Response } from "express";
import { loadActiveSession } from "../../../security/session";
import {
  findActiveAccountById,
  isBlockedBetween,
} from "../../profiles/application/accountViews";
import { canViewRelationshipList } from "../application/canViewRelationshipList";
import { sendError } from "./routeSupport";

export async function requireVisibleRelationshipTarget(
  request: Request,
  response: Response,
  accountId: string,
): Promise<{ viewerId: string | null } | null> {
  const target = await findActiveAccountById(accountId);
  if (!target) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Esta conta não está disponível.");
    return null;
  }
  const session = await loadActiveSession(request);
  const viewerId = session?.accountId ?? null;
  if (viewerId && await isBlockedBetween(viewerId, accountId)) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Esta conta não está disponível.");
    return null;
  }
  if (!await canViewRelationshipList(viewerId, accountId, target.isPrivate)) {
    sendError(response, 403, "PRIVATE_PROFILE", "A lista não está disponível para este perfil.");
    return null;
  }
  return { viewerId };
}
