import { pool } from "@workspace/db";

export async function checkDatabaseReadiness(): Promise<void> {
  // node-postgres honors this query option at runtime; @types/pg declares it only for ClientConfig.
  const readinessQuery = { text: "SELECT 1", query_timeout: 1_500 };
  await pool.query(readinessQuery);
}
