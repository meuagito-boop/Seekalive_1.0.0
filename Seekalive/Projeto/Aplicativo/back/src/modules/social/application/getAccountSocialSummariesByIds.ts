import { and, count, eq, inArray, sql } from "drizzle-orm";
import {
  accountBlocks,
  accountFollows,
  accountFollowRequests,
  db,
} from "@workspace/db";
import { buildRelationshipView, type RelationshipView } from "./relationshipView";
import type { AccountSocialStats } from "./getAccountSocialStats";

export type AccountSocialSummary = {
  relationship: RelationshipView;
  stats: AccountSocialStats;
};

export async function getAccountSocialSummariesByIds(
  accountIds: string[],
  viewerId: string | null,
): Promise<Map<string, AccountSocialSummary>> {
  const ids = [...new Set(accountIds)];
  if (ids.length === 0) return new Map();

  const [followerCounts, followingCounts, circleCounts] = await Promise.all([
    db.select({ id: accountFollows.followedId, total: count() })
      .from(accountFollows)
      .where(inArray(accountFollows.followedId, ids))
      .groupBy(accountFollows.followedId),
    db.select({ id: accountFollows.followerId, total: count() })
      .from(accountFollows)
      .where(inArray(accountFollows.followerId, ids))
      .groupBy(accountFollows.followerId),
    db.select({ id: accountFollows.followerId, total: count() })
      .from(accountFollows)
      .where(and(
        inArray(accountFollows.followerId, ids),
        sql`exists (
          select 1 from ${accountFollows} reciprocal
          where reciprocal.follower_id = ${accountFollows.followedId}
            and reciprocal.followed_id = ${accountFollows.followerId}
        )`,
      ))
      .groupBy(accountFollows.followerId),
  ]);

  const followingSet = new Set<string>();
  const pendingSet = new Set<string>();
  const reciprocalSet = new Set<string>();
  const blockedByMeSet = new Set<string>();
  const blockedByThemSet = new Set<string>();

  if (viewerId) {
    const [outgoing, pending, incoming, blockedByMe, blockedByThem] =
      await Promise.all([
        db.select({ id: accountFollows.followedId })
          .from(accountFollows)
          .where(and(
            eq(accountFollows.followerId, viewerId),
            inArray(accountFollows.followedId, ids),
          )),
        db.select({ id: accountFollowRequests.targetId })
          .from(accountFollowRequests)
          .where(and(
            eq(accountFollowRequests.requesterId, viewerId),
            inArray(accountFollowRequests.targetId, ids),
          )),
        db.select({ id: accountFollows.followerId })
          .from(accountFollows)
          .where(and(
            inArray(accountFollows.followerId, ids),
            eq(accountFollows.followedId, viewerId),
          )),
        db.select({ id: accountBlocks.blockedId })
          .from(accountBlocks)
          .where(and(
            eq(accountBlocks.blockerId, viewerId),
            inArray(accountBlocks.blockedId, ids),
          )),
        db.select({ id: accountBlocks.blockerId })
          .from(accountBlocks)
          .where(and(
            inArray(accountBlocks.blockerId, ids),
            eq(accountBlocks.blockedId, viewerId),
          )),
      ]);

    for (const row of outgoing) followingSet.add(row.id);
    for (const row of pending) pendingSet.add(row.id);
    for (const row of incoming) reciprocalSet.add(row.id);
    for (const row of blockedByMe) blockedByMeSet.add(row.id);
    for (const row of blockedByThem) blockedByThemSet.add(row.id);
  }

  const followers = new Map(followerCounts.map((row) => [row.id, row.total]));
  const following = new Map(followingCounts.map((row) => [row.id, row.total]));
  const circles = new Map(circleCounts.map((row) => [row.id, row.total]));
  const summaries = new Map<string, AccountSocialSummary>();

  for (const id of ids) {
    if (blockedByMeSet.has(id) || blockedByThemSet.has(id)) continue;

    summaries.set(id, {
      relationship: buildRelationshipView({
        acceptedFollow: followingSet.has(id),
        pendingRequest: pendingSet.has(id),
        reciprocalFollow: reciprocalSet.has(id),
        blockedByMe: false,
        blockedByThem: false,
      }),
      stats: {
        posts: 0,
        followers: followers.get(id) ?? 0,
        following: following.get(id) ?? 0,
        circles: circles.get(id) ?? 0,
      },
    });
  }

  return summaries;
}
