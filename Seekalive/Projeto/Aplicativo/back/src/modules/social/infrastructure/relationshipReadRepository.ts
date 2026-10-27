import { and, eq, or } from "drizzle-orm";
import { accountBlocks, accountFollows, accountFollowRequests, db } from "@workspace/db";
import type { RelationshipState } from "../domain/relationshipView";

export async function readRelationshipState(
  viewerId: string,
  targetId: string,
): Promise<RelationshipState> {
  const [
    acceptedFollow,
    pendingRequest,
    reciprocalFollow,
    blockedByMe,
    blockedByThem,
  ] = await Promise.all([
    db.select({ followerId: accountFollows.followerId })
      .from(accountFollows)
      .where(and(
        eq(accountFollows.followerId, viewerId),
        eq(accountFollows.followedId, targetId),
      ))
      .limit(1),
    db.select({ requesterId: accountFollowRequests.requesterId })
      .from(accountFollowRequests)
      .where(and(
        eq(accountFollowRequests.requesterId, viewerId),
        eq(accountFollowRequests.targetId, targetId),
      ))
      .limit(1),
    db.select({ followerId: accountFollows.followerId })
      .from(accountFollows)
      .where(and(
        eq(accountFollows.followerId, targetId),
        eq(accountFollows.followedId, viewerId),
      ))
      .limit(1),
    db.select({ blockerId: accountBlocks.blockerId })
      .from(accountBlocks)
      .where(and(
        eq(accountBlocks.blockerId, viewerId),
        eq(accountBlocks.blockedId, targetId),
      ))
      .limit(1),
    db.select({ blockerId: accountBlocks.blockerId })
      .from(accountBlocks)
      .where(and(
        eq(accountBlocks.blockerId, targetId),
        eq(accountBlocks.blockedId, viewerId),
      ))
      .limit(1),
  ]);

  return {
    acceptedFollow: acceptedFollow.length > 0,
    pendingRequest: pendingRequest.length > 0,
    reciprocalFollow: reciprocalFollow.length > 0,
    blockedByMe: blockedByMe.length > 0,
    blockedByThem: blockedByThem.length > 0,
  };
}

export async function readBlockedBetween(firstId: string, secondId: string): Promise<boolean> {
  const rows = await db
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
  return rows.length > 0;
}

export async function readAcceptedFollow(followerId: string, followedId: string): Promise<boolean> {
  const rows = await db
    .select({ followerId: accountFollows.followerId })
    .from(accountFollows)
    .where(and(
      eq(accountFollows.followerId, followerId),
      eq(accountFollows.followedId, followedId),
    ))
    .limit(1);
  return rows.length > 0;
}
