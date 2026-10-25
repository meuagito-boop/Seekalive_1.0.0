import { and, eq, gt, isNull, ne } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, sessions } from "@workspace/db";
import { createAuthRateLimit } from "../../../../security/request-origin";
import { loadActiveSession, requireCsrf } from "../../../../security/session";
import { sendError } from "../responses";

const router: IRouter = Router();

router.delete(
  "/sessions/others",
  createAuthRateLimit("sessions-revoke-others", 10, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const activeSession = await loadActiveSession(request);
    if (!activeSession) {
      sendError(response, 401, "AUTH_REQUIRED", "Entre novamente para gerenciar suas sessões.");
      return;
    }

    const revoked = await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(sessions.accountId, activeSession.accountId),
        ne(sessions.id, activeSession.sessionId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ))
      .returning({ id: sessions.id });
    response.json({ status: "other_sessions_revoked", revokedCount: revoked.length });
  },
);

export default router;
