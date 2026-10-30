import { and, eq } from "drizzle-orm";
import { db, feedPostBookmarks } from "@workspace/db";

export async function setFeedPostBookmark(
  postId: string,
  accountId: string,
  bookmarked: boolean,
): Promise<void> {
  if (bookmarked) {
    await db
      .insert(feedPostBookmarks)
      .values({ postId, accountId })
      .onConflictDoNothing();
    return;
  }

  await db
    .delete(feedPostBookmarks)
    .where(
      and(
        eq(feedPostBookmarks.postId, postId),
        eq(feedPostBookmarks.accountId, accountId),
      ),
    );
}
