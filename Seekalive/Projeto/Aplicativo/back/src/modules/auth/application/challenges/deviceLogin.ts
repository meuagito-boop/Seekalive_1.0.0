import { randomInt, randomUUID } from "node:crypto";
import { hashDeviceLoginCode } from "../../../../security/tokenHashing";
import { maskEmail } from "../emailMasking";
import type { DeviceLoginChallengeWriter } from "./ports";

export const DEVICE_LOGIN_TTL_MS = 10 * 60 * 1000;
export const MAX_DEVICE_LOGIN_ATTEMPTS = 3;
export const DEVICE_RESEND_COOLDOWN_MS = 30 * 1000;
export const DEVICE_FINAL_RESEND_COOLDOWN_MS = 90 * 1000;

export function createDeviceLoginChallenge(
  writeChallenge: DeviceLoginChallengeWriter,
) {
  return async function createChallenge(
    accountId: string,
    deviceTokenHash: string,
  ) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const challengeId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEVICE_LOGIN_TTL_MS);
    const resendAvailableAt = new Date(
      now.getTime() + DEVICE_RESEND_COOLDOWN_MS,
    );
    const account = await writeChallenge({
      accountId,
      deviceTokenHash,
      challengeId,
      tokenHash: hashDeviceLoginCode(accountId, challengeId, code),
      createdAt: now,
      expiresAt,
      resendAvailableAt,
    });

    if (!account) return null;
    return {
      challengeId,
      code,
      email: account.email,
      emailMasked: maskEmail(account.email),
      displayName: account.displayName,
      createdAt: now,
      expiresAt,
      resendAvailableAt,
    };
  };
}
