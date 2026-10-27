import { randomInt, randomUUID } from "node:crypto";
import { hashPasswordUpdateCode } from "../../../../security/session";
import { maskEmail } from "../emailMasking";
import type { PasswordUpdateChallengeWriter } from "./ports";

export const PASSWORD_UPDATE_TTL_MS = 10 * 60 * 1000;
export const MAX_PASSWORD_UPDATE_ATTEMPTS = 5;

export function createPasswordUpdateChallenge(
  writeChallenge: PasswordUpdateChallengeWriter,
) {
  return async function createChallenge(
    accountId: string,
    pendingPasswordHash: string,
    basePasswordHash: string,
  ) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const challengeId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PASSWORD_UPDATE_TTL_MS);
    const account = await writeChallenge({
      accountId,
      challengeId,
      tokenHash: hashPasswordUpdateCode(accountId, challengeId, code),
      pendingPasswordHash,
      basePasswordHash,
      createdAt: now,
      expiresAt,
    });

    if (!account) return null;
    return {
      challengeId,
      code,
      email: account.email,
      emailMasked: maskEmail(account.email),
      displayName: account.displayName,
      expiresAt,
    };
  };
}
