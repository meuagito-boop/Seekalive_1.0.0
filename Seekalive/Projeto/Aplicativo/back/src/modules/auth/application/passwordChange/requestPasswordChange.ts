import { randomInt, randomUUID } from "node:crypto";
import argon2 from "argon2";
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
import { hashPassword } from "../passwordHashing";
import { hashAccountPasswordChangeCode } from "../../../../security/session";
import { logger } from "../../../../common/logger";
import { getAuthEmailDelivery } from "../../infrastructure/emailDelivery";

export type RequestPasswordChangeResult =
  | { kind: "invalid_current_password" }
  | { kind: "account_unavailable" }
  | { kind: "password_reuse" }
  | { kind: "delivery_unavailable" }
  | { kind: "credentials_changed" }
  | { kind: "rate_limited"; waitSeconds: number }
  | { kind: "delivery_failed" }
  | {
      kind: "created";
      challengeId: string;
      emailMasked: string;
      expiresAt: Date;
      message: string;
    };

export async function requestPasswordChange(
  accountId: string,
  currentPassword: string,
  newPassword: string,
  security: AccountSecurityOperations,
): Promise<RequestPasswordChangeResult> {
  const current = await security.verifyCurrentPassword(accountId, currentPassword);
  if (current.kind === "invalid_credentials") return { kind: "invalid_current_password" };
  if (current.kind === "account_unavailable") return { kind: "account_unavailable" };
  if (await argon2.verify(current.passwordHash, newPassword).catch(() => false)) {
    return { kind: "password_reuse" };
  }

  const delivery = getAuthEmailDelivery();
  if (!delivery.isConfigured) return { kind: "delivery_unavailable" };

  const pendingPasswordHash = await hashPassword(newPassword);
  const challengeId = randomUUID();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ACCOUNT_CHANGE_TTL_MS);
  const result = await db.transaction(async (tx) => {
    const [owner] = await tx
      .select({
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
    if (owner.passwordHash !== current.passwordHash) return { kind: "credentials_changed" as const };

    const recent = await tx
      .select({
        createdAt: authChallenges.createdAt,
        resendAvailableAt: authChallenges.resendAvailableAt,
      })
      .from(authChallenges)
      .where(and(
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, "account_password_change"),
        gt(authChallenges.createdAt, new Date(now.getTime() - ACCOUNT_CHANGE_SEND_WINDOW_MS)),
      ))
      .orderBy(desc(authChallenges.createdAt))
      .limit(MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR);
    const waitSeconds = cooldownSeconds(recent, now);
    if (waitSeconds !== null) return { kind: "rate_limited" as const, waitSeconds };

    await tx
      .update(authChallenges)
      .set({ consumedAt: now, pendingPasswordHash: null, basePasswordHash: null })
      .where(and(
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, "account_password_change"),
        isNull(authChallenges.consumedAt),
      ));
    await tx.insert(authChallenges).values({
      id: challengeId,
      accountId,
      purpose: "account_password_change",
      tokenHash: hashAccountPasswordChangeCode(accountId, challengeId, code),
      pendingPasswordHash,
      basePasswordHash: current.passwordHash,
      attempts: 0,
      createdAt: now,
      expiresAt,
      resendAvailableAt: new Date(now.getTime() + ACCOUNT_CHANGE_SEND_COOLDOWN_MS),
    });
    return { kind: "created" as const, email: owner.email, displayName: owner.displayName };
  });

  if (result.kind !== "created") return result;
  try {
    await delivery.sendAccountPasswordChangeCode({
      email: result.email,
      displayName: result.displayName,
      code,
    });
  } catch {
    logger.warn({ code: "ACCOUNT_PASSWORD_CHANGE_CODE_FAILED" }, "Account password-change code could not be delivered");
    await security.invalidateChallenge(
      challengeId,
      accountId,
      "account_password_change",
    );
    return { kind: "delivery_failed" };
  }

  const emailMasked = maskEmail(result.email);
  return {
    kind: "created",
    challengeId,
    emailMasked,
    expiresAt,
    message: `Enviamos um código para ${emailMasked}.`,
  };
}
