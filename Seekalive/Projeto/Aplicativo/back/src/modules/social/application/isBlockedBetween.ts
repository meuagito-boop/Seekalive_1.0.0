import { and, eq, or } from "drizzle-orm";
import { accountBlocks, db } from "@workspace/db";

export async function isBlockedBetween(
  firstId: string,
  secondId: string,
): Promise<boolean> {
  const row = await db
    .select({ blockerId: accountBlocks.blockerId })
    .from(accountBlocks)
    .where(or(
      and(
        eq(accountBlocks.blockerId, firstId),
        eq(accountBlocks.blockedId, secondId),
      ),
      and(
        eq(accountBlocks.blockerId, secondId),
        eq(accountBlocks.blockedId, firstId),
      ),
    ))
    .limit(1);

  return row.length > 0;
}
