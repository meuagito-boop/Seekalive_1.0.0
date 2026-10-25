import { and, count, eq, sql } from "drizzle-orm";
import { accountFollows, db } from "@workspace/db";

export type AccountSocialStats = {
  posts: number;
  followers: number;
  following: number;
  circles: number;
};

export async function getAccountSocialStats(
  accountId: string,
): Promise<AccountSocialStats> {
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
    posts: 0,
    followers: followers[0]?.total ?? 0,
    following: following[0]?.total ?? 0,
    circles: circles[0]?.total ?? 0,
  };
}
