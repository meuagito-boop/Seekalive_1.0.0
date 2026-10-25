import { and, eq } from "drizzle-orm";
import {
  accountFollows,
  accountFollowRequests,
  db,
} from "@workspace/db";
import {
  hasVerifiedActiveAccount,
  isBlockedInTransaction,
  lockRelationshipAccounts,
} from "./relationshipTransactions";

export async function followAccount(actorId: string, targetId: string) {
  return db.transaction(async (tx) => {
    const lockedAccounts = await lockRelationshipAccounts(tx, actorId, targetId);
    const actor = lockedAccounts.find((account) => account.id === actorId);
    const target = lockedAccounts.find((account) => account.id === targetId);
    if (
      lockedAccounts.length !== 2
      || !await hasVerifiedActiveAccount(tx, actor)
      || !await hasVerifiedActiveAccount(tx, target)
      || await isBlockedInTransaction(tx, actorId, targetId)
    ) return null;

    const [existingFollow] = await tx
      .select({ createdAt: accountFollows.createdAt })
      .from(accountFollows)
      .where(and(eq(accountFollows.followerId, actorId), eq(accountFollows.followedId, targetId)))
      .limit(1);
    if (existingFollow) {
      return { status: "accepted" as const, updatedAt: existingFollow.createdAt.toISOString() };
    }

    if (target?.isPrivate) {
      const [existingRequest] = await tx
        .select({ createdAt: accountFollowRequests.createdAt })
        .from(accountFollowRequests)
        .where(and(
          eq(accountFollowRequests.requesterId, actorId),
          eq(accountFollowRequests.targetId, targetId),
        ))
        .limit(1);
      if (existingRequest) {
        return { status: "pending" as const, updatedAt: existingRequest.createdAt.toISOString() };
      }
      const [created] = await tx
        .insert(accountFollowRequests)
        .values({ requesterId: actorId, targetId })
        .onConflictDoNothing()
        .returning({ createdAt: accountFollowRequests.createdAt });
      return { status: "pending" as const, updatedAt: (created?.createdAt ?? new Date()).toISOString() };
    }

    const [created] = await tx
      .insert(accountFollows)
      .values({ followerId: actorId, followedId: targetId })
      .onConflictDoNothing()
      .returning({ createdAt: accountFollows.createdAt });
    await tx.delete(accountFollowRequests).where(and(
      eq(accountFollowRequests.requesterId, actorId),
      eq(accountFollowRequests.targetId, targetId),
    ));
    return { status: "accepted" as const, updatedAt: (created?.createdAt ?? new Date()).toISOString() };
  });
}
