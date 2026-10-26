import { randomInt } from "node:crypto";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { accountEmails, accounts, authChallenges, db } from "@workspace/db";
import { logger } from "../../../../common/logger";
import {
  constantTimeEquals,
  hashDeviceLoginCode,
  hashToken,
} from "../../../../security/session";
import {
  DEVICE_FINAL_RESEND_COOLDOWN_MS,
  DEVICE_LOGIN_TTL_MS,
  DEVICE_RESEND_COOLDOWN_MS,
  MAX_DEVICE_LOGIN_ATTEMPTS,
} from "../challenges/deviceLogin";
import {
  EmailDeliveryUnavailableError,
  type AuthEmailDelivery,
} from "../../infrastructure/emailDelivery";

export type DeviceLoginResendResult =
  | { kind: "locked" }
  | { kind: "unavailable" }
  | { kind: "invalid" }
  | { kind: "cooldown"; retryAfterSeconds: number }
  | { kind: "delivery_failed" }
  | { kind: "delivery_unavailable" }
  | { kind: "sent"; expiresAt: Date; resendAvailableAt: Date };

export async function resendDeviceLoginCode(
  challengeId: string,
  rawDeviceToken: string,
  delivery: AuthEmailDelivery,
): Promise<DeviceLoginResendResult> {
  const [preview] = await db
    .select({ accountId: authChallenges.accountId })
    .from(authChallenges)
    .where(and(
      eq(authChallenges.id, challengeId),
      eq(authChallenges.purpose, "device_login"),
    ))
    .limit(1);
  if (!preview) return { kind: "invalid" };

  const now = new Date();
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const update = await db.transaction(async (tx) => {
    const [account] = await tx
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
      .where(eq(accounts.id, preview.accountId))
      .for("update")
      .limit(1);
    if (!account || account.status !== "active" || !account.verifiedAt) return { kind: "unavailable" as const };
    if (account.securityLockedAt) return { kind: "locked" as const };

    const [challenge] = await tx
      .select({
        id: authChallenges.id,
        attempts: authChallenges.attempts,
        deviceTokenHash: authChallenges.deviceTokenHash,
        expiresAt: authChallenges.expiresAt,
        resendAvailableAt: authChallenges.resendAvailableAt,
      })
      .from(authChallenges)
      .where(and(
        eq(authChallenges.id, challengeId),
        eq(authChallenges.accountId, account.id),
        eq(authChallenges.purpose, "device_login"),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now),
        lt(authChallenges.attempts, MAX_DEVICE_LOGIN_ATTEMPTS),
      ))
      .for("update")
      .limit(1);
    if (
      !challenge
      || !challenge.deviceTokenHash
      || !constantTimeEquals(hashToken(rawDeviceToken), challenge.deviceTokenHash)
    ) return { kind: "invalid" as const };
    if (challenge.resendAvailableAt && challenge.resendAvailableAt > now) {
      return {
        kind: "cooldown" as const,
        retryAfterSeconds: Math.ceil((challenge.resendAvailableAt.getTime() - now.getTime()) / 1000),
      };
    }

    const resendDelay = challenge.attempts >= 2
      ? DEVICE_FINAL_RESEND_COOLDOWN_MS
      : DEVICE_RESEND_COOLDOWN_MS;
    const resendAvailableAt = new Date(now.getTime() + resendDelay);
    const expiresAt = new Date(now.getTime() + DEVICE_LOGIN_TTL_MS);
    await tx
      .update(authChallenges)
      .set({
        tokenHash: hashDeviceLoginCode(account.id, challenge.id, code),
        expiresAt,
        resendAvailableAt,
      })
      .where(eq(authChallenges.id, challenge.id));
    return {
      kind: "sent" as const,
      email: account.email,
      displayName: account.displayName,
      expiresAt,
      resendAvailableAt,
    };
  });

  if (update.kind !== "sent") return update;
  try {
    if (!delivery.isConfigured) throw new EmailDeliveryUnavailableError();
    await delivery.sendDeviceLoginCode({
      email: update.email,
      displayName: update.displayName,
      code,
    });
  } catch {
    logger.warn({ code: "DEVICE_LOGIN_RESEND_FAILED" }, "Device verification email could not be delivered");
    await db
      .update(authChallenges)
      .set({ consumedAt: new Date() })
      .where(and(eq(authChallenges.id, challengeId), isNull(authChallenges.consumedAt)));
    return delivery.isConfigured ? { kind: "delivery_failed" } : { kind: "delivery_unavailable" };
  }
  return {
    kind: "sent",
    expiresAt: update.expiresAt,
    resendAvailableAt: update.resendAvailableAt,
  };
}
