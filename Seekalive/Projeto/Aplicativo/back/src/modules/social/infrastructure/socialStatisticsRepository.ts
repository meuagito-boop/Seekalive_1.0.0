import { and, count, eq, inArray, sql } from "drizzle-orm";
import {
  accountBlocks,
  accountFollows,
  accountFollowRequests,
  db,
} from "@workspace/db";

export async function readAccountSocialStats(accountId: string) {
  const [followers, following, circles] = await Promise.all([
    db.select({ total: count() })
      .from(accountFollows)
      .where(eq(accountFollows.followedId, accountId)),
    db.select({ total: count() })
      .from(accountFollows)
      .where(eq(accountFollows.followerId, accountId)),
    db.select({ total: sql<number>`count(*)::int` })
      .from(accountFollows)
      .where(and(
        eq(accountFollows.followerId, accountId),
        sql`exists (
          select 1 from ${accountFollows} reciprocal
          where reciprocal.follower_id = ${accountFollows.followedId}
            and reciprocal.followed_id = ${accountId}
        )`,
      )),
  ]);

  return {
    followers: followers[0]?.total ?? 0,
    following: following[0]?.total ?? 0,
    circles: circles[0]?.total ?? 0,
  };
}

export async function readSocialSummaryRows(accountIds: string[], viewerId: string | null) {
  const ids = [...new Set(accountIds)];
  if (ids.length === 0) {
    return {
      followerCounts: [],
      followingCounts: [],
      circleCounts: [],
      outgoing: [],
      pending: [],
      incoming: [],
      blockedByMe: [],
      blockedByThem: [],
    };
  }

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

  let outgoing: { id: string }[] = [];
  let pending: { id: string }[] = [];
  let incoming: { id: string }[] = [];
  let blockedByMe: { id: string }[] = [];
  let blockedByThem: { id: string }[] = [];
  if (viewerId) {
    [outgoing, pending, incoming, blockedByMe, blockedByThem] = await Promise.all([
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
  }

  return {
    followerCounts,
    followingCounts,
    circleCounts,
    outgoing,
    pending,
    incoming,
    blockedByMe,
    blockedByThem,
  };
}
