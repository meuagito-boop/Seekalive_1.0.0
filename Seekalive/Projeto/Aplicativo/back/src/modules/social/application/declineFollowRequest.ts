import { and, eq } from "drizzle-orm";
import { accountFollowRequests, db } from "@workspace/db";
import { lockRelationshipAccounts } from "./relationshipTransactions";

export async function declineFollowRequest(targetId: string, requesterId: string): Promise<void> {
  await db.transaction(async (tx) => {
    if ((await lockRelationshipAccounts(tx, targetId, requesterId)).length !== 2) return;
    await tx.delete(accountFollowRequests).where(and(
      eq(accountFollowRequests.requesterId, requesterId),
      eq(accountFollowRequests.targetId, targetId),
    ));
  });
}
