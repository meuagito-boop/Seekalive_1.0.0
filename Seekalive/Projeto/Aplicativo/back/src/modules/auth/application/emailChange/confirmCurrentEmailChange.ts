import { randomInt, randomUUID } from "node:crypto";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { accountEmails, accounts, authChallenges, db } from "@workspace/db";
import {
  ACCOUNT_CHANGE_SEND_COOLDOWN_MS,
  ACCOUNT_CHANGE_TTL_MS,
  invalidChallengeMessage,
  MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS,
} from "../accountSecurity/policy";
import type { AccountSecurityOperations } from "../accountSecurity/ports";
import { maskEmail } from "../emailMasking";
import { constantTimeEquals, hashAccountEmailChangeCode } from "../../../../security/session";
import { logger } from "../../../../common/logger";
import { getAuthEmailDelivery } from "../../infrastructure/emailDelivery";

export type ConfirmCurrentEmailResult =
  | { kind: "account_unavailable" }
  | { kind: "email_unavailable" }
  | { kind: "invalid"; message: string }
  | {
      kind: "created";
      challengeId: string;
      emailMasked: string;
      expiresAt: Date;
      message: string;
    }
  | { kind: "delivery_failed" };

export async function confirmCurrentEmailChange(
  accountId: string,
  challengeId: string,
  submittedCode: string,
  security: AccountSecurityOperations,
): Promise<ConfirmCurrentEmailResult> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const nextChallengeId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ACCOUNT_CHANGE_TTL_MS);
  const result = await db.transaction(async (tx) => {
    const [owner] = await tx
      .select({
        status: accounts.status,
        securityLockedAt: accounts.securityLockedAt,
        emailVerifiedAt: accountEmails.verifiedAt,
        displayName: accounts.displayName,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(eq(accounts.id, accountId))
      .for("update")
      .limit(1);
    if (!owner || owner.status !== "active" || !owner.emailVerifiedAt || owner.securityLockedAt) {
      return { kind: "account_unavailable" as const };
    }
    const [challenge] = await tx
      .select({
        id: authChallenges.id,
        tokenHash: authChallenges.tokenHash,
        pendingEmail: authChallenges.pendingEmail,
        attempts: authChallenges.attempts,
      })
      .from(authChallenges)
      .where(and(
        eq(authChallenges.id, challengeId),
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, "account_email_change_current"),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now),
        lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
      ))
      .for("update")
      .limit(1);
    if (!challenge?.pendingEmail) return { kind: "invalid" as const };

    const expectedHash = hashAccountEmailChangeCode(
      accountId,
      challenge.id,
      "account_email_change_current",
      submittedCode,
    );
    if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
      await tx
        .update(authChallenges)
        .set({
          attempts: sql`${authChallenges.attempts} + 1`,
          pendingEmail: challenge.attempts + 1 >= MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS ? null : challenge.pendingEmail,
        })
        .where(and(
          eq(authChallenges.id, challenge.id),
          isNull(authChallenges.consumedAt),
          gt(authChallenges.expiresAt, now),
          lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
        ));
      return { kind: "invalid" as const };
    }

    const [usedAddress] = await tx
      .select({ accountId: accountEmails.accountId })
      .from(accountEmails)
      .where(eq(accountEmails.emailNormalized, challenge.pendingEmail))
      .limit(1);
    await tx
      .update(authChallenges)
      .set({ consumedAt: now, pendingEmail: null })
      .where(and(eq(authChallenges.id, challenge.id), isNull(authChallenges.consumedAt)));
    if (usedAddress) return { kind: "email_unavailable" as const };

    await tx.insert(authChallenges).values({
      id: nextChallengeId,
      accountId,
      purpose: "account_email_change_new",
      tokenHash: hashAccountEmailChangeCode(accountId, nextChallengeId, "account_email_change_new", code),
      pendingEmail: challenge.pendingEmail,
      attempts: 0,
      createdAt: now,
      expiresAt,
      resendAvailableAt: new Date(now.getTime() + ACCOUNT_CHANGE_SEND_COOLDOWN_MS),
    });
    return { kind: "created" as const, pendingEmail: challenge.pendingEmail, displayName: owner.displayName };
  });

  if (result.kind !== "created") {
    return result.kind === "invalid"
      ? { kind: "invalid", message: invalidChallengeMessage }
      : result;
  }

  try {
    await getAuthEmailDelivery().sendAccountEmailChangeNewCode({
      email: result.pendingEmail,
      displayName: result.displayName,
      code,
    });
  } catch {
    logger.warn({ code: "ACCOUNT_EMAIL_CHANGE_NEW_CODE_FAILED" }, "New-address confirmation code could not be delivered");
    await security.invalidateChallenge(
      nextChallengeId,
      accountId,
      "account_email_change_new",
    );
    return { kind: "delivery_failed" };
  }

  const emailMasked = maskEmail(result.pendingEmail);
  return {
    kind: "created",
    challengeId: nextChallengeId,
    emailMasked,
    expiresAt,
    message: `Enviamos um código para ${emailMasked}.`,
  };
}
