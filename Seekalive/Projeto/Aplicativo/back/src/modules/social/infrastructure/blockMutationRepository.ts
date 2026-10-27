import { and, eq, sql } from "drizzle-orm";
import { accountBlocks, accountFollows, accountFollowRequests, db } from "@workspace/db";
import {
  hasVerifiedActiveAccount,
  lockRelationshipAccounts,
} from "./relationshipTransactionSupport";
import { canCreateBlock } from "../domain/relationshipPolicies";

export async function persistBlockAccount(actorId: string, targetId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const lockedAccounts = await lockRelationshipAccounts(tx, actorId, targetId);
    const actor = lockedAccounts.find((account) => account.id === actorId);
    const target = lockedAccounts.find((account) => account.id === targetId);
    const eligible = lockedAccounts.length === 2;
    if (!canCreateBlock({
      actorIsEligible: eligible && await hasVerifiedActiveAccount(tx, actor),
      targetIsEligible: eligible && await hasVerifiedActiveAccount(tx, target),
    })) return false;
    await tx.insert(accountBlocks)
      .values({ blockerId: actorId, blockedId: targetId })
      .onConflictDoNothing();
    await tx.delete(accountFollows).where(sql`(
      (${accountFollows.followerId} = ${actorId} and ${accountFollows.followedId} = ${targetId})
      or (${accountFollows.followerId} = ${targetId} and ${accountFollows.followedId} = ${actorId})
    )`);
    await tx.delete(accountFollowRequests).where(sql`(
      (${accountFollowRequests.requesterId} = ${actorId} and ${accountFollowRequests.targetId} = ${targetId})
      or (${accountFollowRequests.requesterId} = ${targetId} and ${accountFollowRequests.targetId} = ${actorId})
    )`);
    return true;
  });
}

export async function persistUnblockAccount(actorId: string, targetId: string): Promise<void> {
  await db.transaction(async (tx) => {
    if ((await lockRelationshipAccounts(tx, actorId, targetId)).length !== 2) return;
    await tx.delete(accountBlocks).where(and(
      eq(accountBlocks.blockerId, actorId),
      eq(accountBlocks.blockedId, targetId),
    ));
  });
}
