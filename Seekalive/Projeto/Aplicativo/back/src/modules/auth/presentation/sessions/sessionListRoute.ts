import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, sessions } from "@workspace/db";
import { createAuthRateLimit } from "../../../../security/request-origin";
import { loadActiveSession } from "../../../../security/session";
import { sendError } from "../responses";

const router: IRouter = Router();

router.get(
  "/sessions",
  createAuthRateLimit("sessions-list", 60, 15 * 60 * 1000),
  async (request, response) => {
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
    const rows = await db
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(and(
        eq(sessions.accountId, activeSession.accountId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ))
      .orderBy(desc(sessions.createdAt), desc(sessions.id))
      .limit(pageSize + 1)
      .offset(offset);

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
  },
);

export default router;
