import { and, desc, eq, gt, isNull, ne } from "drizzle-orm";
import { db, sessions } from "@workspace/db";
import type { SessionManagementRepository } from "../application/sessions/sessionManagement";

function activeSessionPredicate(accountId: string, now: Date) {
  return and(
    eq(sessions.accountId, accountId),
    isNull(sessions.revokedAt),
    gt(sessions.expiresAt, now),
  );
}

export const sessionManagementRepository: SessionManagementRepository = {
  async listActiveSessions(accountId, offset, now) {
    return db
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(activeSessionPredicate(accountId, now))
      .orderBy(desc(sessions.createdAt), desc(sessions.id))
      .limit(21)
      .offset(offset);
  },

  async revokeOtherSessions(accountId, currentSessionId, now) {
    return db
      .update(sessions)
      .set({ revokedAt: now })
      .where(
        and(
          activeSessionPredicate(accountId, now),
          ne(sessions.id, currentSessionId),
        ),
      )
      .returning({ id: sessions.id });
  },

  async revokeSession(accountId, sessionId, now) {
    const [revoked] = await db
      .update(sessions)
      .set({ revokedAt: now })
      .where(
        and(eq(sessions.id, sessionId), activeSessionPredicate(accountId, now)),
      )
      .returning({ id: sessions.id });
    return Boolean(revoked);
  },

  async revokeSessionByTokenHash(tokenHash, now) {
    await db
      .update(sessions)
      .set({ revokedAt: now })
      .where(
        and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)),
      );
  },
};
