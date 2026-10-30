import { and, eq } from "drizzle-orm";
import { db, feedPostReposts } from "@workspace/db";

export async function setFeedPostRepost(
  postId: string,
  accountId: string,
  reposted: boolean,
): Promise<void> {
  if (reposted) {
    await db
      .insert(feedPostReposts)
      .values({ postId, accountId })
      .onConflictDoNothing();
    return;
  }

  await db
    .delete(feedPostReposts)
    .where(
      and(
        eq(feedPostReposts.postId, postId),
        eq(feedPostReposts.accountId, accountId),
      ),
    );
}
