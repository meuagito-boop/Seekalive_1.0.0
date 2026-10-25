import { randomInt, randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { accountEmails, accounts, authChallenges, db } from "@workspace/db";
import {
  hashDeviceLoginCode,
  hashToken,
} from "../../../../security/session";
import { maskEmail } from "../emailMasking";

export const DEVICE_LOGIN_TTL_MS = 10 * 60 * 1000;
export const MAX_DEVICE_LOGIN_ATTEMPTS = 3;
export const DEVICE_RESEND_COOLDOWN_MS = 30 * 1000;
export const DEVICE_FINAL_RESEND_COOLDOWN_MS = 90 * 1000;

export async function createDeviceLoginChallenge(accountId: string, deviceTokenHash: string) {
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
        eq(authChallenges.purpose, "device_login"),
        eq(authChallenges.deviceTokenHash, deviceTokenHash),
        isNull(authChallenges.consumedAt),
      ));
    await tx.insert(authChallenges).values({
      id: challengeId,
      accountId,
      purpose: "device_login",
      tokenHash: hashDeviceLoginCode(accountId, challengeId, code),
      deviceTokenHash,
      attempts: 0,
      createdAt: now,
      expiresAt: new Date(now.getTime() + DEVICE_LOGIN_TTL_MS),
      resendAvailableAt: new Date(now.getTime() + DEVICE_RESEND_COOLDOWN_MS),
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
    createdAt: now,
    expiresAt: new Date(now.getTime() + DEVICE_LOGIN_TTL_MS),
    resendAvailableAt: new Date(now.getTime() + DEVICE_RESEND_COOLDOWN_MS),
  };
}
