import { and, eq } from "drizzle-orm";
import { accountFollows, accountFollowRequests, db } from "@workspace/db";
import { lockRelationshipAccounts } from "./relationshipTransactions";

export async function unfollowAccount(actorId: string, targetId: string): Promise<void> {
  await db.transaction(async (tx) => {
    if ((await lockRelationshipAccounts(tx, actorId, targetId)).length !== 2) return;
    await tx.delete(accountFollows).where(and(
      eq(accountFollows.followerId, actorId),
      eq(accountFollows.followedId, targetId),
    ));
    await tx.delete(accountFollowRequests).where(and(
      eq(accountFollowRequests.requesterId, actorId),
      eq(accountFollowRequests.targetId, targetId),
    ));
  });
}
