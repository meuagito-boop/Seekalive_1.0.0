import { and, asc, desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";
import {
  accountBlocks,
  accountEmails,
  accountFollowRequests,
  accountFollows,
  accountProfiles,
  accounts,
  db,
} from "@workspace/db";

export async function searchVerifiedAccountIds(query: string, limit: number, offset: number) {
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  return db
    .select({ id: accounts.id })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .innerJoin(accountProfiles, eq(accountProfiles.accountId, accounts.id))
    .where(and(
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
      or(
        ilike(accounts.username, pattern),
        ilike(accountProfiles.displayName, pattern),
      ),
    ))
    .orderBy(asc(accounts.username), asc(accounts.id))
    .limit(limit + 1)
    .offset(offset);
}

export async function listFollowerIds(accountId: string, limit: number, offset: number) {
  return db
    .select({ id: accountFollows.followerId })
    .from(accountFollows)
    .innerJoin(accounts, eq(accounts.id, accountFollows.followerId))
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      eq(accountFollows.followedId, accountId),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ))
    .orderBy(desc(accountFollows.createdAt))
    .limit(limit + 1)
    .offset(offset);
}

export async function listFollowingIds(accountId: string, limit: number, offset: number) {
  return db
    .select({ id: accountFollows.followedId })
    .from(accountFollows)
    .innerJoin(accounts, eq(accounts.id, accountFollows.followedId))
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      eq(accountFollows.followerId, accountId),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ))
    .orderBy(desc(accountFollows.createdAt))
    .limit(limit + 1)
    .offset(offset);
}

export async function listCircleIds(accountId: string, limit: number, offset: number) {
  return db
    .select({ id: accountFollows.followedId })
    .from(accountFollows)
    .innerJoin(accounts, eq(accounts.id, accountFollows.followedId))
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      eq(accountFollows.followerId, accountId),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
      sql`exists (
        select 1 from ${accountFollows} reciprocal
        where reciprocal.follower_id = ${accountFollows.followedId}
          and reciprocal.followed_id = ${accountFollows.followerId}
      )`,
    ))
    .orderBy(desc(accountFollows.createdAt))
    .limit(limit + 1)
    .offset(offset);
}

export async function listIncomingFollowRequests(accountId: string, limit: number, offset: number) {
  return db
    .select({ id: accountFollowRequests.requesterId, createdAt: accountFollowRequests.createdAt })
    .from(accountFollowRequests)
    .innerJoin(accounts, eq(accounts.id, accountFollowRequests.requesterId))
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      eq(accountFollowRequests.targetId, accountId),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ))
    .orderBy(desc(accountFollowRequests.createdAt))
    .limit(limit + 1)
    .offset(offset);
}

export async function listBlockedAccountIds(accountId: string) {
  return db
    .select({ id: accountBlocks.blockedId })
    .from(accountBlocks)
    .where(eq(accountBlocks.blockerId, accountId))
    .orderBy(desc(accountBlocks.createdAt));
}
