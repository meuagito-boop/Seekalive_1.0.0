import { sql, type SQL } from "drizzle-orm";

export const ACCOUNT_IDENTITY_COOLDOWN_DAYS = 30;
export const USERNAME_RESERVATION_DAYS = 30;
export const ACCOUNT_IDENTITY_COOLDOWN_MS =
  ACCOUNT_IDENTITY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
export const USERNAME_RESERVATION_MS =
  USERNAME_RESERVATION_DAYS * 24 * 60 * 60 * 1000;

type SqlExecutor = {
  execute: (query: SQL) => unknown;
};

export function nextIdentityChangeAt(lastChangedAt: Date | null, createdAt: Date): Date {
  return new Date((lastChangedAt ?? createdAt).getTime() + ACCOUNT_IDENTITY_COOLDOWN_MS);
}

export async function lockUsernameClaims(
  transaction: SqlExecutor,
  usernames: readonly string[],
): Promise<void> {
  const normalizedNames = [...new Set(usernames.map((username) => username.toLowerCase()))].sort();
  for (const username of normalizedNames) {
    await transaction.execute(sql`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${"seekalive:username:" + username}, 0)
      )
    `);
  }
}
