import { randomInt } from "node:crypto";
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
import { type AuthEmailDelivery } from "../emailDelivery";
import type { DeviceVerificationRepository } from "./ports";

export type DeviceLoginResendResult =
  | { kind: "locked" }
  | { kind: "unavailable" }
  | { kind: "invalid" }
  | { kind: "cooldown"; retryAfterSeconds: number }
  | { kind: "delivery_failed" }
  | { kind: "delivery_unavailable" }
  | { kind: "sent"; expiresAt: Date; resendAvailableAt: Date };

export function createResendDeviceLoginCode(
  repository: DeviceVerificationRepository,
) {
  return async function resendDeviceLoginCode(
    challengeId: string,
    rawDeviceToken: string,
    delivery: AuthEmailDelivery,
  ): Promise<DeviceLoginResendResult> {
    const accountId = await repository.findAccountIdForChallenge(challengeId);
    if (!accountId) return { kind: "invalid" };

    const now = new Date();
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const update = await repository.withTransaction(async (tx) => {
      const account = await tx.lockResendAccount(accountId);
      if (!account || account.status !== "active" || !account.verifiedAt) {
        return { kind: "unavailable" as const };
      }
      if (account.securityLockedAt) return { kind: "locked" as const };

      const challenge = await tx.lockResendChallenge({
        challengeId,
        accountId: account.id,
        now,
        maxAttempts: MAX_DEVICE_LOGIN_ATTEMPTS,
      });
      if (
        !challenge ||
        !challenge.deviceTokenHash ||
        !constantTimeEquals(
          hashToken(rawDeviceToken),
          challenge.deviceTokenHash,
        )
      ) {
        return { kind: "invalid" as const };
      }
      if (challenge.resendAvailableAt && challenge.resendAvailableAt > now) {
        return {
          kind: "cooldown" as const,
          retryAfterSeconds: Math.ceil(
            (challenge.resendAvailableAt.getTime() - now.getTime()) / 1000,
          ),
        };
      }

      const resendDelay =
        challenge.attempts >= 2
          ? DEVICE_FINAL_RESEND_COOLDOWN_MS
          : DEVICE_RESEND_COOLDOWN_MS;
      const resendAvailableAt = new Date(now.getTime() + resendDelay);
      const expiresAt = new Date(now.getTime() + DEVICE_LOGIN_TTL_MS);
      await tx.updateChallengeForResend({
        challengeId: challenge.id,
        tokenHash: hashDeviceLoginCode(account.id, challenge.id, code),
        expiresAt,
        resendAvailableAt,
      });
      return {
        kind: "sent" as const,
        email: account.email,
        displayName: account.displayName,
        expiresAt,
        resendAvailableAt,
      };
    });

    if (update.kind !== "sent") return update;
    if (!delivery.isConfigured) {
      logger.warn(
        { code: "DEVICE_LOGIN_RESEND_FAILED" },
        "Device verification email could not be delivered",
      );
      await repository.invalidateChallenge(challengeId, new Date());
      return { kind: "delivery_unavailable" };
    }
    try {
      await delivery.sendDeviceLoginCode({
        email: update.email,
        displayName: update.displayName,
        code,
      });
    } catch {
      logger.warn(
        { code: "DEVICE_LOGIN_RESEND_FAILED" },
        "Device verification email could not be delivered",
      );
      await repository.invalidateChallenge(challengeId, new Date());
      return { kind: "delivery_failed" };
    }
    return {
      kind: "sent",
      expiresAt: update.expiresAt,
      resendAvailableAt: update.resendAvailableAt,
    };
  };
}
