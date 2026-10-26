import { sql, type SQL } from "drizzle-orm";

type SqlExecutor = {
  execute: (query: SQL) => unknown;
};

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
