import { randomInt, randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { accountEmails, accounts, authChallenges, db } from "@workspace/db";
import { hashPasswordUpdateCode } from "../../../../security/session";
import { maskEmail } from "../emailMasking";

export const PASSWORD_UPDATE_TTL_MS = 10 * 60 * 1000;
export const MAX_PASSWORD_UPDATE_ATTEMPTS = 5;

export async function createPasswordUpdateChallenge(
  accountId: string,
  pendingPasswordHash: string,
  basePasswordHash: string,
) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const challengeId = randomUUID();
  const now = new Date();
  const [account] = await db.transaction(async (tx) => {
    const [lockedAccount] = await tx
      .select({
        id: accounts.id,
        displayName: accounts.displayName,
        email: accountEmails.emailNormalized,
        status: accounts.status,
        verifiedAt: accountEmails.verifiedAt,
        securityLockedAt: accounts.securityLockedAt,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(eq(accounts.id, accountId))
      .for("update")
      .limit(1);
    if (
      !lockedAccount
      || lockedAccount.status !== "active"
      || !lockedAccount.verifiedAt
      || lockedAccount.securityLockedAt
    ) return [];

    await tx
      .update(authChallenges)
      .set({ consumedAt: now })
      .where(and(
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, "password_update"),
        isNull(authChallenges.consumedAt),
      ));
    await tx.insert(authChallenges).values({
      id: challengeId,
      accountId,
      purpose: "password_update",
      tokenHash: hashPasswordUpdateCode(accountId, challengeId, code),
      pendingPasswordHash,
      basePasswordHash,
      attempts: 0,
      createdAt: now,
      expiresAt: new Date(now.getTime() + PASSWORD_UPDATE_TTL_MS),
    });
    return [lockedAccount];
  });

  if (!account) return null;
  return {
    challengeId,
    code,
    email: account.email,
    emailMasked: maskEmail(account.email),
    displayName: account.displayName,
    expiresAt: new Date(now.getTime() + PASSWORD_UPDATE_TTL_MS),
  };
}
