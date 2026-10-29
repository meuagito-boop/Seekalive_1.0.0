import { and, asc, eq, gt, inArray, isNull } from "drizzle-orm";
import { accounts, db, sessions } from "@workspace/db";
import { selectOldestSessionIdsToRevoke } from "../application/sessions/sessionPolicy";

type AccountSessionTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

type SessionCreationInput = {
  accountId: string;
  deviceId: string;
  material: {
    tokenHash: string;
    csrfTokenHash: string;
    createdAt: Date;
    expiresAt: Date;
  };
  passwordPolicyVersion: number;
};

export async function createSessionWithLimit(
  tx: AccountSessionTransaction,
  input: SessionCreationInput,
) {
  const [account] = await tx
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.id, input.accountId))
    .for("update")
    .limit(1);

  if (!account) return null;

  const activeSessions = await tx
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.accountId, input.accountId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, input.material.createdAt),
      ),
    )
    .orderBy(asc(sessions.createdAt), asc(sessions.id))
    .for("update");

  const sessionIdsToRevoke = selectOldestSessionIdsToRevoke(activeSessions);

  if (sessionIdsToRevoke.length > 0) {
    await tx
      .update(sessions)
      .set({ revokedAt: input.material.createdAt })
      .where(
        and(
          eq(sessions.accountId, input.accountId),
          inArray(sessions.id, sessionIdsToRevoke),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, input.material.createdAt),
        ),
      );
  }

  const [session] = await tx
    .insert(sessions)
    .values({
      accountId: input.accountId,
      deviceId: input.deviceId,
      tokenHash: input.material.tokenHash,
      csrfTokenHash: input.material.csrfTokenHash,
      passwordPolicyVersion: input.passwordPolicyVersion,
      createdAt: input.material.createdAt,
      expiresAt: input.material.expiresAt,
    })
    .returning({
      id: sessions.id,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
    });

  return session ?? null;
}
