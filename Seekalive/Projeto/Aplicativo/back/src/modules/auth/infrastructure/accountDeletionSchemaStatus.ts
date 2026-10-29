import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const CACHE_TTL_MS = 30_000;
let cachedStatus: { checkedAt: number; ready: boolean } | null = null;

export async function isAccountDeletionSchemaReady(): Promise<boolean> {
  const now = Date.now();
  if (cachedStatus && now - cachedStatus.checkedAt < CACHE_TTL_MS) {
    return cachedStatus.ready;
  }

  const schemaName = process.env.SEEKALIVE_DB_SCHEMA?.trim() || "accounts";
  const result = await db.execute(sql`
    SELECT
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = ${schemaName}
          AND table_name = 'accounts'
          AND column_name = 'deletion_requested_at'
      )
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = ${schemaName}
          AND table_name = 'accounts'
          AND column_name = 'deletion_scheduled_for'
      )
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = ${schemaName}
          AND table_name = 'accounts'
          AND column_name = 'deletion_retention_until'
      ) AS ready
  `);
  const ready = result.rows[0]?.["ready"] === true;
  cachedStatus = { checkedAt: now, ready };
  return ready;
}
