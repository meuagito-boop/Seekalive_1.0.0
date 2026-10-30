import { and, eq } from "drizzle-orm";
import { db, feedPostLikes } from "@workspace/db";

export async function setFeedPostLike(
  postId: string,
  accountId: string,
  liked: boolean,
): Promise<void> {
  if (liked) {
    await db
      .insert(feedPostLikes)
      .values({ postId, accountId })
      .onConflictDoNothing();
    return;
  }

  await db
    .delete(feedPostLikes)
    .where(
      and(
        eq(feedPostLikes.postId, postId),
        eq(feedPostLikes.accountId, accountId),
      ),
    );
}
