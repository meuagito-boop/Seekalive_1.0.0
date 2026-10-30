import { and, eq } from "drizzle-orm";
import { db, feedCommentLikes } from "@workspace/db";

export async function setFeedCommentLike(
  commentId: string,
  accountId: string,
  liked: boolean,
): Promise<void> {
  if (liked) {
    await db
      .insert(feedCommentLikes)
      .values({ commentId, accountId })
      .onConflictDoNothing();
    return;
  }

  await db
    .delete(feedCommentLikes)
    .where(
      and(
        eq(feedCommentLikes.commentId, commentId),
        eq(feedCommentLikes.accountId, accountId),
      ),
    );
}
