export const ACCOUNT_CHANGE_TTL_MS = 10 * 60 * 1000;
export const ACCOUNT_CHANGE_SEND_COOLDOWN_MS = 60 * 1000;
export const ACCOUNT_CHANGE_SEND_WINDOW_MS = 60 * 60 * 1000;
export const MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR = 5;
export const MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS = 5;
export const invalidChallengeMessage =
  "Código inválido ou expirado. Inicie a alteração novamente.";

export type RecentChallenge = {
  createdAt: Date;
  resendAvailableAt: Date | null;
};

export function cooldownSeconds(
  recent: RecentChallenge[],
  now: Date,
): number | null {
  const latest = recent[0];
  if (latest?.resendAvailableAt && latest.resendAvailableAt > now) {
    return Math.max(
      1,
      Math.ceil((latest.resendAvailableAt.getTime() - now.getTime()) / 1000),
    );
  }
  if (recent.length >= MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR) {
    const oldestAllowed = recent[MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR - 1];
    if (oldestAllowed) {
      return Math.max(
        1,
        Math.ceil(
          (oldestAllowed.createdAt.getTime() +
            ACCOUNT_CHANGE_SEND_WINDOW_MS -
            now.getTime()) /
            1000,
        ),
      );
    }
  }
  return null;
}
