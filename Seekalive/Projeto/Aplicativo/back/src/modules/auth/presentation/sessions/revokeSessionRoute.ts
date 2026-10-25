import { and, eq, gt, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, sessions } from "@workspace/db";
import { sessionIdParamSchema } from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../../security/request-origin";
import { loadActiveSession, requireCsrf } from "../../../../security/session";
import { sendError, sendValidationError } from "../responses";

const router: IRouter = Router();

router.delete(
  "/sessions/:sessionId",
  createAuthRateLimit("session-revoke", 20, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
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

    const [revoked] = await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(sessions.id, params.data.sessionId),
        eq(sessions.accountId, activeSession.accountId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ))
      .returning({ id: sessions.id });
    if (!revoked) {
      sendError(response, 404, "SESSION_NOT_FOUND", "A sessão não foi encontrada ou já foi encerrada.");
      return;
    }
    response.status(204).end();
  },
);

export default router;
