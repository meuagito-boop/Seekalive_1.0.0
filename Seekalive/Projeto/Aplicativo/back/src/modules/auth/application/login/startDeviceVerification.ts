import { randomBytes } from "node:crypto";
import { logger } from "../../../../common/logger";
import { hashToken } from "../../../../security/session";
import type { StartDeviceVerificationDependencies } from "./ports";

export type DeviceVerificationStartResult =
  | { kind: "delivery_unavailable" }
  | { kind: "account_unavailable" }
  | { kind: "delivery_failed" }
  | {
      kind: "challenge_created";
      rawDeviceToken: string;
      challenge: {
        challengeId: string;
        emailMasked: string;
        expiresAt: Date;
        resendAvailableAt: Date;
      };
    };

export function createStartDeviceVerification(
  dependencies: StartDeviceVerificationDependencies,
) {
  return async function startDeviceVerification(
    accountId: string,
  ): Promise<DeviceVerificationStartResult> {
    const delivery = dependencies.getEmailDelivery();
    if (!delivery.isConfigured) return { kind: "delivery_unavailable" };

    const rawDeviceToken = randomBytes(32).toString("base64url");
    const pendingDeviceHash = hashToken(rawDeviceToken);
    const challenge = await dependencies.createChallenge(
      accountId,
      pendingDeviceHash,
    );
    if (!challenge) return { kind: "account_unavailable" };

    try {
      await delivery.sendDeviceLoginCode({
        email: challenge.email,
        displayName: challenge.displayName,
        code: challenge.code,
      });
    } catch {
      logger.warn(
        { code: "DEVICE_LOGIN_EMAIL_FAILED" },
        "Device verification email could not be delivered",
      );
      await dependencies.invalidateChallenge(challenge.challengeId);
      return { kind: "delivery_failed" };
    }

    return {
      kind: "challenge_created",
      rawDeviceToken,
      challenge: {
        challengeId: challenge.challengeId,
        emailMasked: challenge.emailMasked,
        expiresAt: challenge.expiresAt,
        resendAvailableAt: challenge.resendAvailableAt,
      },
    };
  };
}
