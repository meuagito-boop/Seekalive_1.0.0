import { randomInt, randomUUID } from "node:crypto";
import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { accountEmails, accounts, authChallenges, db, passwordCredentials } from "@workspace/db";
import {
  ACCOUNT_CHANGE_SEND_COOLDOWN_MS,
  ACCOUNT_CHANGE_SEND_WINDOW_MS,
  ACCOUNT_CHANGE_TTL_MS,
  cooldownSeconds,
  MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR,
} from "../accountSecurity/policy";
import type { AccountSecurityOperations } from "../accountSecurity/ports";
import { maskEmail } from "../emailMasking";
import { hashAccountEmailChangeCode } from "../../../../security/session";
import { logger } from "../../../../common/logger";
import { getAuthEmailDelivery } from "../../infrastructure/emailDelivery";

export type StartEmailChangeResult =
  | { kind: "invalid_current_password" }
  | { kind: "account_unavailable" }
  | { kind: "email_unchanged" }
  | { kind: "delivery_unavailable" }
  | { kind: "credentials_changed" }
  | { kind: "email_unavailable" }
  | { kind: "rate_limited"; waitSeconds: number }
  | { kind: "delivery_failed" }
  | {
      kind: "created";
      challengeId: string;
      currentEmailMasked: string;
      newEmailMasked: string;
      expiresAt: Date;
      message: string;
    };

export async function startEmailChange(
  accountId: string,
  currentPassword: string,
  newEmail: string,
  security: AccountSecurityOperations,
): Promise<StartEmailChangeResult> {
  const current = await security.verifyCurrentPassword(accountId, currentPassword);
  if (current.kind === "invalid_credentials") return { kind: "invalid_current_password" };
  if (current.kind === "account_unavailable") return { kind: "account_unavailable" };
  if (newEmail === current.email) return { kind: "email_unchanged" };

  const delivery = getAuthEmailDelivery();
  if (!delivery.isConfigured) return { kind: "delivery_unavailable" };

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const challengeId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ACCOUNT_CHANGE_TTL_MS);
  const result = await db.transaction(async (tx) => {
    const [owner] = await tx
      .select({
        id: accounts.id,
        status: accounts.status,
        securityLockedAt: accounts.securityLockedAt,
        email: accountEmails.emailNormalized,
        emailVerifiedAt: accountEmails.verifiedAt,
        displayName: accounts.displayName,
        passwordHash: passwordCredentials.passwordHash,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
      .where(eq(accounts.id, accountId))
      .for("update")
      .limit(1);
    if (!owner || owner.status !== "active" || !owner.emailVerifiedAt || owner.securityLockedAt) {
      return { kind: "account_unavailable" as const };
    }
    if (owner.email !== current.email || owner.passwordHash !== current.passwordHash) {
      return { kind: "credentials_changed" as const };
    }
    const [usedAddress] = await tx
      .select({ accountId: accountEmails.accountId })
      .from(accountEmails)
      .where(eq(accountEmails.emailNormalized, newEmail))
      .limit(1);
    if (usedAddress) return { kind: "email_unavailable" as const };

    const recent = await tx
      .select({
        createdAt: authChallenges.createdAt,
        resendAvailableAt: authChallenges.resendAvailableAt,
      })
      .from(authChallenges)
      .where(and(
        eq(authChallenges.accountId, accountId),
        inArray(authChallenges.purpose, ["account_email_change_current", "account_email_change_new"]),
        gt(authChallenges.createdAt, new Date(now.getTime() - ACCOUNT_CHANGE_SEND_WINDOW_MS)),
      ))
      .orderBy(desc(authChallenges.createdAt))
      .limit(MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR);
    const waitSeconds = cooldownSeconds(recent, now);
    if (waitSeconds !== null) return { kind: "rate_limited" as const, waitSeconds };

    await tx
      .update(authChallenges)
      .set({ consumedAt: now, pendingEmail: null })
      .where(and(
        eq(authChallenges.accountId, accountId),
        inArray(authChallenges.purpose, ["account_email_change_current", "account_email_change_new"]),
        isNull(authChallenges.consumedAt),
      ));
    await tx.insert(authChallenges).values({
      id: challengeId,
      accountId,
      purpose: "account_email_change_current",
      tokenHash: hashAccountEmailChangeCode(accountId, challengeId, "account_email_change_current", code),
      pendingEmail: newEmail,
      attempts: 0,
      createdAt: now,
      expiresAt,
      resendAvailableAt: new Date(now.getTime() + ACCOUNT_CHANGE_SEND_COOLDOWN_MS),
    });
    return { kind: "created" as const, currentEmail: owner.email, displayName: owner.displayName };
  });

  if (result.kind !== "created") return result;
  try {
    await delivery.sendAccountEmailChangeCurrentCode({
      email: result.currentEmail,
      displayName: result.displayName,
      code,
    });
  } catch {
    logger.warn({ code: "ACCOUNT_EMAIL_CHANGE_CURRENT_CODE_FAILED" }, "Account email-change code could not be delivered");
    await security.invalidateChallenge(
      challengeId,
      accountId,
      "account_email_change_current",
    );
    return { kind: "delivery_failed" };
  }

  const currentEmailMasked = maskEmail(result.currentEmail);
  return {
    kind: "created",
    challengeId,
    currentEmailMasked,
    newEmailMasked: maskEmail(newEmail),
    expiresAt,
    message: `Enviamos um código para ${currentEmailMasked}.`,
  };
}
