import { and, eq } from "drizzle-orm";
import {
  accountBlocks,
  accountFollows,
  accountFollowRequests,
  db,
} from "@workspace/db";
import { buildRelationshipView, type RelationshipView } from "./relationshipView";

const emptyRelationship: RelationshipView = {
  following: "none",
  inCircle: false,
  blockedByMe: false,
  blockedByThem: false,
  mutedByMe: false,
};

export async function getRelationshipFor(
  viewerId: string | null,
  targetId: string,
): Promise<RelationshipView> {
  if (!viewerId || viewerId === targetId) return emptyRelationship;

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

  return buildRelationshipView({
    acceptedFollow: acceptedFollow.length > 0,
    pendingRequest: pendingRequest.length > 0,
    reciprocalFollow: reciprocalFollow.length > 0,
    blockedByMe: blockedByMe.length > 0,
    blockedByThem: blockedByThem.length > 0,
  });
}
