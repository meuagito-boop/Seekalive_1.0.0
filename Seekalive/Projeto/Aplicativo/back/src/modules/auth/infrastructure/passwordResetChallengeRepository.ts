import { and, eq, gt, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { accountEmails, accounts, authChallenges, db } from "@workspace/db";
import type { PasswordResetChallengeWriter } from "../application/challenges/ports";

export const writePasswordResetChallenge: PasswordResetChallengeWriter = async (
  input,
) =>
  db.transaction(async (tx) => {
    const [account] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(
        and(
          eq(accounts.id, input.accountId),
          eq(accounts.status, "active"),
          isNotNull(accountEmails.verifiedAt),
        ),
      )
      .for("update");
    if (!account) return false;

    const [requestCount] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(authChallenges)
      .where(
        and(
          eq(authChallenges.accountId, input.accountId),
          eq(authChallenges.purpose, "reset_password"),
          gt(authChallenges.createdAt, input.oneHourAgo),
        ),
      );
    if ((requestCount?.count ?? 0) >= input.maxRequestsPerHour) return false;

    const [recentRequest] = await tx
      .select({ id: authChallenges.id })
      .from(authChallenges)
      .where(
        and(
          eq(authChallenges.accountId, input.accountId),
          eq(authChallenges.purpose, "reset_password"),
          gt(authChallenges.createdAt, input.cooldownSince),
        ),
      )
      .limit(1);
    if (recentRequest) return false;

    await tx
      .delete(authChallenges)
      .where(
        and(
          eq(authChallenges.accountId, input.accountId),
          eq(authChallenges.purpose, "reset_password"),
          lt(authChallenges.expiresAt, input.oneHourAgo),
        ),
      );
    await tx
      .update(authChallenges)
      .set({ consumedAt: input.now })
      .where(
        and(
          eq(authChallenges.accountId, input.accountId),
          eq(authChallenges.purpose, "reset_password"),
          isNull(authChallenges.consumedAt),
        ),
      );
    await tx.insert(authChallenges).values({
      accountId: input.accountId,
      purpose: "reset_password",
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    });
    return true;
  });

export async function invalidatePasswordResetChallenge(
  accountId: string,
  tokenHash: string,
  now: Date,
): Promise<void> {
  await db
    .update(authChallenges)
    .set({ consumedAt: now })
    .where(
      and(
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, "reset_password"),
        eq(authChallenges.tokenHash, tokenHash),
        isNull(authChallenges.consumedAt),
      ),
    );
}
