export const ACCOUNT_IDENTITY_COOLDOWN_DAYS = 30;
export const USERNAME_RESERVATION_DAYS = 30;
export const ACCOUNT_IDENTITY_COOLDOWN_MS =
  ACCOUNT_IDENTITY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
export const USERNAME_RESERVATION_MS =
  USERNAME_RESERVATION_DAYS * 24 * 60 * 60 * 1000;

export function nextIdentityChangeAt(lastChangedAt: Date | null, createdAt: Date): Date {
  return new Date((lastChangedAt ?? createdAt).getTime() + ACCOUNT_IDENTITY_COOLDOWN_MS);
}
