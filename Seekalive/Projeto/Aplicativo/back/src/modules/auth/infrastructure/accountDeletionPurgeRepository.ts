import { and, eq, lte } from "drizzle-orm";
import { accounts, db } from "@workspace/db";

export async function purgeOneExpiredAccountRetention(
  now: Date,
): Promise<{ accountId: string } | null> {
  return db.transaction(async (tx) => {
    const [account] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.status, "deletion_retained"),
          lte(accounts.deletionRetentionUntil, now),
        ),
      )
      .orderBy(accounts.deletionRetentionUntil)
      .for("update", { skipLocked: true })
      .limit(1);

    if (!account) return null;

    const [deleted] = await tx
      .delete(accounts)
      .where(
        and(
          eq(accounts.id, account.id),
          eq(accounts.status, "deletion_retained"),
          lte(accounts.deletionRetentionUntil, now),
        ),
      )
      .returning({ id: accounts.id });

    return deleted ? { accountId: deleted.id } : null;
  });
}
