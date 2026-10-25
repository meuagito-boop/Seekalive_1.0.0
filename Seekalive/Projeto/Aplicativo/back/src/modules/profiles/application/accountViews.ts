import { and, count, eq, inArray, isNotNull, sql } from "drizzle-orm";
import {
  accountBlocks,
  accountEmails,
  accountFollows,
  accountFollowRequests,
  accounts,
  db,
} from "@workspace/db";

export type PublicAccountRow = {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  locationLabel: string | null;
  websiteUrl: string | null;
  accountType: string;
  isPrivate: boolean;
  createdAt: Date;
  version: number;
};

export type RelationshipView = {
  following: "none" | "pending" | "accepted";
  inCircle: boolean;
  blockedByMe: boolean;
  blockedByThem: boolean;
  mutedByMe: boolean;
};

export async function findActiveAccountById(id: string): Promise<PublicAccountRow | null> {
  const [row] = await db
    .select({
      id: accounts.id,
      username: accounts.username,
      displayName: accounts.displayName,
      bio: accounts.bio,
      locationLabel: accounts.locationLabel,
      websiteUrl: accounts.websiteUrl,
      accountType: accounts.accountType,
      isPrivate: accounts.isPrivate,
      createdAt: accounts.createdAt,
      version: accounts.version,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      eq(accounts.id, id),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ))
    .limit(1);
  return row ?? null;
}

export async function findActiveAccountByUsername(username: string): Promise<PublicAccountRow | null> {
  const [row] = await db
    .select({
      id: accounts.id,
      username: accounts.username,
      displayName: accounts.displayName,
      bio: accounts.bio,
      locationLabel: accounts.locationLabel,
      websiteUrl: accounts.websiteUrl,
      accountType: accounts.accountType,
      isPrivate: accounts.isPrivate,
      createdAt: accounts.createdAt,
      version: accounts.version,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      eq(accounts.username, username),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ))
    .limit(1);
  return row ?? null;
}

export async function relationshipFor(viewerId: string | null, targetId: string): Promise<RelationshipView> {
  if (!viewerId || viewerId === targetId) {
    return { following: "none", inCircle: false, blockedByMe: false, blockedByThem: false, mutedByMe: false };
  }

  const [acceptedFollow, pendingRequest, reciprocalFollow, blockedByMe, blockedByThem] = await Promise.all([
    db.select({ followerId: accountFollows.followerId })
      .from(accountFollows)
      .where(and(eq(accountFollows.followerId, viewerId), eq(accountFollows.followedId, targetId)))
      .limit(1),
    db.select({ requesterId: accountFollowRequests.requesterId })
      .from(accountFollowRequests)
      .where(and(eq(accountFollowRequests.requesterId, viewerId), eq(accountFollowRequests.targetId, targetId)))
      .limit(1),
    db.select({ followerId: accountFollows.followerId })
      .from(accountFollows)
      .where(and(eq(accountFollows.followerId, targetId), eq(accountFollows.followedId, viewerId)))
      .limit(1),
    db.select({ blockerId: accountBlocks.blockerId })
      .from(accountBlocks)
      .where(and(eq(accountBlocks.blockerId, viewerId), eq(accountBlocks.blockedId, targetId)))
      .limit(1),
    db.select({ blockerId: accountBlocks.blockerId })
      .from(accountBlocks)
      .where(and(eq(accountBlocks.blockerId, targetId), eq(accountBlocks.blockedId, viewerId)))
      .limit(1),
  ]);
  const following = acceptedFollow.length ? "accepted" : pendingRequest.length ? "pending" : "none";
  return {
    following,
    inCircle: following === "accepted" && reciprocalFollow.length > 0,
    blockedByMe: blockedByMe.length > 0,
    blockedByThem: blockedByThem.length > 0,
    mutedByMe: false,
  };
}

async function accountStats(accountId: string) {
  const [followers, following, circles] = await Promise.all([
    db.select({ total: count() }).from(accountFollows).where(eq(accountFollows.followedId, accountId)),
    db.select({ total: count() }).from(accountFollows).where(eq(accountFollows.followerId, accountId)),
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
    posts: 0,
    followers: followers[0]?.total ?? 0,
    following: following[0]?.total ?? 0,
    circles: circles[0]?.total ?? 0,
  };
}

function buildAccountView(
  row: PublicAccountRow,
  viewerId: string | null,
  relationship: RelationshipView,
  stats: { posts: number; followers: number; following: number; circles: number },
) {
  const privateDetailsVisible = !row.isPrivate
    || viewerId === row.id
    || relationship.following === "accepted";
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    bio: privateDetailsVisible ? row.bio : "",
    avatarUrl: null,
    coverUrl: null,
    location: privateDetailsVisible ? row.locationLabel : null,
    website: privateDetailsVisible ? row.websiteUrl : null,
    accountType: row.accountType,
    isPrivate: row.isPrivate,
    joinedAt: row.createdAt.toISOString(),
    relationship,
    stats,
    version: row.version,
  };
}

export async function accountView(row: PublicAccountRow, viewerId: string | null) {
  const [relationship, stats] = await Promise.all([
    relationshipFor(viewerId, row.id),
    accountStats(row.id),
  ]);
  return buildAccountView(row, viewerId, relationship, stats);
}

export async function accountViewsByIds(ids: string[], viewerId: string | null) {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return [];

  const rows = await db
    .select({
      id: accounts.id,
      username: accounts.username,
      displayName: accounts.displayName,
      bio: accounts.bio,
      locationLabel: accounts.locationLabel,
      websiteUrl: accounts.websiteUrl,
      accountType: accounts.accountType,
      isPrivate: accounts.isPrivate,
      createdAt: accounts.createdAt,
      version: accounts.version,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      inArray(accounts.id, uniqueIds),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ));
  if (rows.length === 0) return [];

  const idsToQuery = rows.map((row) => row.id);
  const [followerCounts, followingCounts, circleCounts] = await Promise.all([
    db.select({ id: accountFollows.followedId, total: count() })
      .from(accountFollows)
      .where(inArray(accountFollows.followedId, idsToQuery))
      .groupBy(accountFollows.followedId),
    db.select({ id: accountFollows.followerId, total: count() })
      .from(accountFollows)
      .where(inArray(accountFollows.followerId, idsToQuery))
      .groupBy(accountFollows.followerId),
    db.select({ id: accountFollows.followerId, total: count() })
      .from(accountFollows)
      .where(and(
        inArray(accountFollows.followerId, idsToQuery),
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
    const [outgoing, pending, incoming, blockedByMe, blockedByThem] = await Promise.all([
      db.select({ id: accountFollows.followedId }).from(accountFollows)
        .where(and(eq(accountFollows.followerId, viewerId), inArray(accountFollows.followedId, idsToQuery))),
      db.select({ id: accountFollowRequests.targetId }).from(accountFollowRequests)
        .where(and(eq(accountFollowRequests.requesterId, viewerId), inArray(accountFollowRequests.targetId, idsToQuery))),
      db.select({ id: accountFollows.followerId }).from(accountFollows)
        .where(and(inArray(accountFollows.followerId, idsToQuery), eq(accountFollows.followedId, viewerId))),
      db.select({ id: accountBlocks.blockedId }).from(accountBlocks)
        .where(and(eq(accountBlocks.blockerId, viewerId), inArray(accountBlocks.blockedId, idsToQuery))),
      db.select({ id: accountBlocks.blockerId }).from(accountBlocks)
        .where(and(inArray(accountBlocks.blockerId, idsToQuery), eq(accountBlocks.blockedId, viewerId))),
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
  const byId = new Map<string, ReturnType<typeof buildAccountView>>();
  for (const row of rows) {
    if (blockedByMeSet.has(row.id) || blockedByThemSet.has(row.id)) continue;
    const isFollowing = followingSet.has(row.id);
    const relationship: RelationshipView = {
      following: isFollowing ? "accepted" : pendingSet.has(row.id) ? "pending" : "none",
      inCircle: isFollowing && reciprocalSet.has(row.id),
      blockedByMe: blockedByMeSet.has(row.id),
      blockedByThem: blockedByThemSet.has(row.id),
      mutedByMe: false,
    };
    byId.set(row.id, buildAccountView(row, viewerId, relationship, {
      posts: 0,
      followers: followers.get(row.id) ?? 0,
      following: following.get(row.id) ?? 0,
      circles: circles.get(row.id) ?? 0,
    }));
  }
  return ids.map((id) => byId.get(id)).filter((account) => account !== undefined);
}

export async function isBlockedBetween(firstId: string, secondId: string): Promise<boolean> {
  const rows = await db
    .select({ blockerId: accountBlocks.blockerId })
    .from(accountBlocks)
    .where(and(
      sql`(${accountBlocks.blockerId} = ${firstId} and ${accountBlocks.blockedId} = ${secondId})
        or (${accountBlocks.blockerId} = ${secondId} and ${accountBlocks.blockedId} = ${firstId})`,
    ))
    .limit(1);
  return rows.length > 0;
}
