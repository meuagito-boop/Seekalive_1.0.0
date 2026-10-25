import { randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { authChallenges, db } from "@workspace/db";
import { logger } from "../../../../common/logger";
import { hashToken } from "../../../../security/session";
import { createDeviceLoginChallenge } from "../challenges/deviceLogin";
import { getAuthEmailDelivery } from "../../infrastructure/emailDelivery";

export type DeviceVerificationStartResult =
  | { kind: "delivery_unavailable" }
  | { kind: "account_unavailable" }
  | { kind: "delivery_failed" }
  | {
      kind: "challenge_created";
      rawDeviceToken: string;
      challenge: NonNullable<Awaited<ReturnType<typeof createDeviceLoginChallenge>>>;
    };

export async function startDeviceVerification(accountId: string): Promise<DeviceVerificationStartResult> {
  const delivery = getAuthEmailDelivery();
  if (!delivery.isConfigured) return { kind: "delivery_unavailable" };

  const rawDeviceToken = randomBytes(32).toString("base64url");
  const pendingDeviceHash = hashToken(rawDeviceToken);
  const challenge = await createDeviceLoginChallenge(accountId, pendingDeviceHash);
  if (!challenge) return { kind: "account_unavailable" };

  try {
    await delivery.sendDeviceLoginCode({
      email: challenge.email,
      displayName: challenge.displayName,
      code: challenge.code,
    });
  } catch {
    logger.warn({ code: "DEVICE_LOGIN_EMAIL_FAILED" }, "Device verification email could not be delivered");
    await db
      .update(authChallenges)
      .set({ consumedAt: new Date() })
      .where(and(eq(authChallenges.id, challenge.challengeId), isNull(authChallenges.consumedAt)));
    return { kind: "delivery_failed" };
  }

  return { kind: "challenge_created", rawDeviceToken, challenge };
}
