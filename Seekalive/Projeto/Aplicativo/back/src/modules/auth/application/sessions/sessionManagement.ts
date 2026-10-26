import { and, desc, eq, gt, isNull, ne } from "drizzle-orm";
import { db, sessions } from "@workspace/db";

const ACTIVE_SESSION_PREDICATE = (accountId: string, now: Date) => and(
  eq(sessions.accountId, accountId),
  isNull(sessions.revokedAt),
  gt(sessions.expiresAt, now),
);

export async function listActiveSessions(accountId: string, offset: number, now = new Date()) {
  return db
    .select({
      id: sessions.id,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(ACTIVE_SESSION_PREDICATE(accountId, now))
    .orderBy(desc(sessions.createdAt), desc(sessions.id))
    .limit(21)
    .offset(offset);
}

export async function revokeOtherSessions(accountId: string, currentSessionId: string, now = new Date()) {
  return db
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(
      ACTIVE_SESSION_PREDICATE(accountId, now),
      ne(sessions.id, currentSessionId),
    ))
    .returning({ id: sessions.id });
}

export async function revokeSession(
  accountId: string,
  sessionId: string,
  now = new Date(),
) {
  const [revoked] = await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(
      eq(sessions.id, sessionId),
      ACTIVE_SESSION_PREDICATE(accountId, now),
    ))
    .returning({ id: sessions.id });
  return Boolean(revoked);
}

export async function revokeSessionByTokenHash(tokenHash: string, now = new Date()): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)));
}
