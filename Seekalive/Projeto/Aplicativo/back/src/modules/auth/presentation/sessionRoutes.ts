import { Router, type IRouter, type Request, type Response } from "express";
import { sessionIdParamSchema } from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../security/request-origin";
import {
  clearDeviceCookie,
  clearSessionCookie,
  hashToken,
  loadActiveSession,
  PRE_AUTH_COOKIE,
  requireCsrf,
  SESSION_COOKIE,
} from "../../../security/session";
import {
  listActiveSessions,
  revokeOtherSessions,
  revokeSession,
  revokeSessionByTokenHash,
} from "../application/sessions/sessionManagement";
import { sendError, sendValidationError } from "./responses";

const router: IRouter = Router();

router.get("/session", async (request, response) => {
  const activeSession = await loadActiveSession(request);
  if (!activeSession) {
    response.json({ authenticated: false, account: null, session: null });
    return;
  }
  response.json({
    authenticated: true,
    account: {
      id: activeSession.accountId,
      username: activeSession.username,
      displayName: activeSession.displayName,
      accountType: activeSession.accountType,
      joinedAt: activeSession.createdAt.toISOString(),
      onboardingCompleted: activeSession.onboardingCompletedAt !== null,
    },
    session: {
      id: activeSession.sessionId,
      createdAt: activeSession.createdAt.toISOString(),
      expiresAt: activeSession.expiresAt.toISOString(),
    },
  });
});

router.get("/sessions", createAuthRateLimit("sessions-list", 60, 15 * 60 * 1000), async (request, response) => {
  const activeSession = await loadActiveSession(request);
  if (!activeSession) {
    sendError(response, 401, "AUTH_REQUIRED", "Entre novamente para gerenciar suas sessões.");
    return;
  }

  const rawCursor = request.query.cursor;
  let offset = 0;
  if (rawCursor !== undefined) {
    if (typeof rawCursor !== "string" || rawCursor.length > 16) {
      sendError(response, 400, "VALIDATION_ERROR", "O cursor da página é inválido.");
      return;
    }
    const decoded = Buffer.from(rawCursor, "base64url").toString("utf8");
    if (
      !/^(0|[1-9][0-9]{0,6})$/.test(decoded)
      || Buffer.from(decoded).toString("base64url") !== rawCursor
      || Number(decoded) > 1_000_000
    ) {
      sendError(response, 400, "VALIDATION_ERROR", "O cursor da página é inválido.");
      return;
    }
    offset = Number(decoded);
  }

  const pageSize = 20;
  const rows = await listActiveSessions(activeSession.accountId, offset);

  const hasMore = rows.length > pageSize;
  response.json({
    items: rows.slice(0, pageSize).map((session) => ({
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      isCurrent: session.id === activeSession.sessionId,
    })),
    nextCursor: hasMore ? Buffer.from(String(offset + pageSize)).toString("base64url") : null,
  });
});

router.delete("/sessions/others", createAuthRateLimit("sessions-revoke-others", 10, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const activeSession = await loadActiveSession(request);
  if (!activeSession) {
    sendError(response, 401, "AUTH_REQUIRED", "Entre novamente para gerenciar suas sessões.");
    return;
  }

  const revoked = await revokeOtherSessions(activeSession.accountId, activeSession.sessionId);
  response.json({ status: "other_sessions_revoked", revokedCount: revoked.length });
});

router.delete("/sessions/:sessionId", createAuthRateLimit("session-revoke", 20, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const params = sessionIdParamSchema.safeParse(request.params);
  if (!params.success) {
    sendValidationError(response, params.error.issues);
    return;
  }

  const activeSession = await loadActiveSession(request);
  if (!activeSession) {
    sendError(response, 401, "AUTH_REQUIRED", "Entre novamente para gerenciar suas sessões.");
    return;
  }
  if (params.data.sessionId === activeSession.sessionId) {
    sendError(response, 409, "CURRENT_SESSION_USE_LOGOUT", "Use a opção de sair para encerrar esta sessão.");
    return;
  }

  const revoked = await revokeSession(activeSession.accountId, params.data.sessionId);
  if (!revoked) {
    sendError(response, 404, "SESSION_NOT_FOUND", "A sessão não foi encontrada ou já foi encerrada.");
    return;
  }
  response.status(204).end();
});

router.post("/logout", requireCsrf, async (request: Request, response: Response) => {
  const rawToken = request.cookies?.[SESSION_COOKIE];
  if (rawToken) {
    await revokeSessionByTokenHash(hashToken(rawToken));
  }
  clearSessionCookie(response);
  response.clearCookie(PRE_AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  response.status(204).end();
});

export default router;
