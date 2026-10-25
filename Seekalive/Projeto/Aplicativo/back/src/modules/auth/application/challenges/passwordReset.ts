import { randomInt } from "node:crypto";
import { and, eq, gt, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { accountEmails, accounts, authChallenges, db } from "@workspace/db";
import { hashPasswordResetCode } from "../../../../security/session";

const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;

export async function createPasswordResetChallenge(accountId: string) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const tokenHash = hashPasswordResetCode(accountId, code);
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const cooldownSince = new Date(now.getTime() - PASSWORD_RESET_COOLDOWN_MS);

  const created = await db.transaction(async (tx) => {
    const [lockedAccount] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(and(
        eq(accounts.id, accountId),
        eq(accounts.status, "active"),
        isNotNull(accountEmails.verifiedAt),
      ))
      .for("update");
    if (!lockedAccount) return false;

    const [requestCount] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(authChallenges)
      .where(and(
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, "reset_password"),
        gt(authChallenges.createdAt, oneHourAgo),
      ));
    if ((requestCount?.count ?? 0) >= 5) return false;

    const [recentRequest] = await tx
      .select({ id: authChallenges.id })
      .from(authChallenges)
      .where(and(
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, "reset_password"),
        gt(authChallenges.createdAt, cooldownSince),
      ))
      .limit(1);
    if (recentRequest) return false;

    await tx
      .delete(authChallenges)
      .where(and(
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, "reset_password"),
        lt(authChallenges.expiresAt, oneHourAgo),
      ));
    await tx
      .update(authChallenges)
      .set({ consumedAt: now })
      .where(and(
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, "reset_password"),
        isNull(authChallenges.consumedAt),
      ));
    await tx.insert(authChallenges).values({
      accountId,
      purpose: "reset_password",
      tokenHash,
      expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
    });
    return true;
  });

  return created ? { code, tokenHash } : null;
}
