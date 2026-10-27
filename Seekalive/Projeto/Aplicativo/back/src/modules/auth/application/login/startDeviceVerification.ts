import { randomBytes } from "node:crypto";
import { logger } from "../../../../common/logger";
import { hashToken } from "../../../../security/session";
import type {
  ChallengeByIdInvalidator,
  DeviceLoginChallengeCreator,
} from "../challenges/ports";
import { getAuthEmailDelivery } from "../../infrastructure/emailDelivery";

export type DeviceVerificationStartResult =
  | { kind: "delivery_unavailable" }
  | { kind: "account_unavailable" }
  | { kind: "delivery_failed" }
  | {
      kind: "challenge_created";
      rawDeviceToken: string;
      challenge: NonNullable<Awaited<ReturnType<DeviceLoginChallengeCreator>>>;
    };

export async function startDeviceVerification(
  accountId: string,
  dependencies: {
    createChallenge: DeviceLoginChallengeCreator;
    invalidateChallenge: ChallengeByIdInvalidator;
  },
): Promise<DeviceVerificationStartResult> {
  const delivery = getAuthEmailDelivery();
  if (!delivery.isConfigured) return { kind: "delivery_unavailable" };

  const rawDeviceToken = randomBytes(32).toString("base64url");
  const pendingDeviceHash = hashToken(rawDeviceToken);
  const challenge = await dependencies.createChallenge(accountId, pendingDeviceHash);
  if (!challenge) return { kind: "account_unavailable" };

  try {
    await delivery.sendDeviceLoginCode({
      email: challenge.email,
      displayName: challenge.displayName,
      code: challenge.code,
    });
  } catch {
    logger.warn({ code: "DEVICE_LOGIN_EMAIL_FAILED" }, "Device verification email could not be delivered");
    await dependencies.invalidateChallenge(challenge.challengeId);
    return { kind: "delivery_failed" };
  }

  return { kind: "challenge_created", rawDeviceToken, challenge };
}
