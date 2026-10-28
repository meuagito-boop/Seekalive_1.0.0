import { randomInt } from "node:crypto";
import { hashPasswordResetCode } from "../../../../security/tokenHashing";
import type { PasswordResetChallengeWriter } from "./ports";

const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;

export function createPasswordResetChallenge(
  writeChallenge: PasswordResetChallengeWriter,
) {
  return async function createChallenge(accountId: string) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const tokenHash = hashPasswordResetCode(accountId, code);
    const now = new Date();
    const created = await writeChallenge({
      accountId,
      tokenHash,
      now,
      expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MS),
      oneHourAgo: new Date(now.getTime() - 60 * 60 * 1000),
      cooldownSince: new Date(now.getTime() - PASSWORD_RESET_COOLDOWN_MS),
      maxRequestsPerHour: 5,
    });

    return created ? { code, tokenHash } : null;
  };
}
