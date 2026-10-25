import { Router, type IRouter, type Request, type Response } from "express";
import { loadActiveSession } from "../../../security/session";
import {
  accountView,
  findActiveAccountById,
  findActiveAccountByUsername,
  isBlockedBetween,
  relationshipFor,
} from "../application/accountViews";
import { canViewPrivateProfileContent } from "../application/profileVisibility";
import type { PublicAccountRow } from "../application/accountViews";
import { sendError } from "./routeSupport";

const router: IRouter = Router();
const emptyPage = { items: [], nextCursor: null };

async function respondWithProfile(
  request: Request,
  response: Response,
  row: PublicAccountRow,
): Promise<void> {
  const session = await loadActiveSession(request);
  const viewerId = session?.accountId ?? null;
  if (viewerId && await isBlockedBetween(viewerId, row.id)) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Este perfil não está disponível.");
    return;
  }
  const relationship = await relationshipFor(viewerId, row.id);
  const canViewPublicContent = canViewPrivateProfileContent(
    row.isPrivate,
    viewerId,
    row.id,
    relationship.following,
  );
  const account = await accountView(row, viewerId, relationship);
  response.json({
    account,
    visibility: {
      canViewPublicContent,
      canViewCircleContent: relationship.inCircle || viewerId === row.id,
    },
    posts: emptyPage,
    articles: emptyPage,
    media: emptyPage,
  });
}

router.get("/profiles/:username", async (request, response) => {
  const username = typeof request.params.username === "string" ? request.params.username.toLowerCase() : "";
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Este perfil não está disponível.");
    return;
  }
  const row = await findActiveAccountByUsername(username);
  if (!row) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Este perfil não está disponível.");
    return;
  }
  await respondWithProfile(request, response, row);
});

router.get("/accounts/:accountId", async (request, response) => {
  const accountId = typeof request.params.accountId === "string" ? request.params.accountId : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(accountId)) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Este perfil não está disponível.");
    return;
  }
  const row = await findActiveAccountById(accountId);
  if (!row) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Este perfil não está disponível.");
    return;
  }
  const session = await loadActiveSession(request);
  const viewerId = session?.accountId ?? null;
  if (viewerId && await isBlockedBetween(viewerId, accountId)) {
    sendError(response, 404, "ACCOUNT_NOT_FOUND", "Este perfil não está disponível.");
    return;
  }
  response.json(await accountView(row, viewerId));
});

export default router;
