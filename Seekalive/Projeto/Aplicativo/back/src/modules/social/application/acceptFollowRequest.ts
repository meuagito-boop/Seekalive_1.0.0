import { and, eq } from "drizzle-orm";
import { accountFollows, accountFollowRequests, db } from "@workspace/db";
import {
  hasVerifiedActiveAccount,
  isBlockedInTransaction,
  lockRelationshipAccounts,
} from "./relationshipTransactions";

export async function acceptFollowRequest(targetId: string, requesterId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const lockedAccounts = await lockRelationshipAccounts(tx, targetId, requesterId);
    const target = lockedAccounts.find((account) => account.id === targetId);
    const requester = lockedAccounts.find((account) => account.id === requesterId);
    if (
      lockedAccounts.length !== 2
      || !await hasVerifiedActiveAccount(tx, target)
      || !await hasVerifiedActiveAccount(tx, requester)
      || await isBlockedInTransaction(tx, targetId, requesterId)
    ) return false;
    const [pending] = await tx
      .select({ createdAt: accountFollowRequests.createdAt })
      .from(accountFollowRequests)
      .where(and(
        eq(accountFollowRequests.requesterId, requesterId),
        eq(accountFollowRequests.targetId, targetId),
      ))
      .limit(1);
    if (!pending) return false;
    await tx.insert(accountFollows)
      .values({ followerId: requesterId, followedId: targetId })
      .onConflictDoNothing();
    await tx.delete(accountFollowRequests).where(and(
      eq(accountFollowRequests.requesterId, requesterId),
      eq(accountFollowRequests.targetId, targetId),
    ));
    return true;
  });
}
