import { and, eq } from "drizzle-orm";
import { accountBlocks, db } from "@workspace/db";
import { lockRelationshipAccounts } from "./relationshipTransactions";

export async function unblockAccount(actorId: string, targetId: string): Promise<void> {
  await db.transaction(async (tx) => {
    if ((await lockRelationshipAccounts(tx, actorId, targetId)).length !== 2) return;
    await tx.delete(accountBlocks).where(and(
      eq(accountBlocks.blockerId, actorId),
      eq(accountBlocks.blockedId, targetId),
    ));
  });
}
