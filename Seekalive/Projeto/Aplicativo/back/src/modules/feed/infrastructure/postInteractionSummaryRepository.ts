import { and, count, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  feedCommentLikes,
  feedPostBookmarks,
  feedPostComments,
  feedPostLikes,
  feedPostReposts,
} from "@workspace/db";
import {
  EMPTY_POST_INTERACTION_SUMMARY,
  type PostInteractionSummary,
} from "../domain/postInteractions";

export async function findPostInteractionSummaries(
  postIds: string[],
  viewerId: string | null,
): Promise<Map<string, PostInteractionSummary>> {
  const ids = [...new Set(postIds)];
  if (ids.length === 0) return new Map();

  const [likeRows, commentRows, repostRows, bookmarkedRows] =
    await Promise.all([
      db
        .select({
          postId: feedPostLikes.postId,
          total: count(),
          isActive: sql<boolean>`coalesce(bool_or(${feedPostLikes.accountId} = ${viewerId}), false)`,
        })
        .from(feedPostLikes)
        .where(inArray(feedPostLikes.postId, ids))
        .groupBy(feedPostLikes.postId),
      db
        .select({
          postId: feedPostComments.postId,
          total: count(),
        })
        .from(feedPostComments)
        .where(inArray(feedPostComments.postId, ids))
        .groupBy(feedPostComments.postId),
      db
        .select({
          postId: feedPostReposts.postId,
          total: count(),
          isActive: sql<boolean>`coalesce(bool_or(${feedPostReposts.accountId} = ${viewerId}), false)`,
        })
        .from(feedPostReposts)
        .where(inArray(feedPostReposts.postId, ids))
        .groupBy(feedPostReposts.postId),
      viewerId
        ? db
            .select({ postId: feedPostBookmarks.postId })
            .from(feedPostBookmarks)
            .where(and(
              inArray(feedPostBookmarks.postId, ids),
              eq(feedPostBookmarks.accountId, viewerId),
            ))
        : Promise.resolve([]),
    ]);

  const summaries = new Map<string, PostInteractionSummary>(
    ids.map((postId) => [
      postId,
      { ...EMPTY_POST_INTERACTION_SUMMARY },
    ]),
  );

  for (const row of likeRows) {
    const summary = summaries.get(row.postId);
    if (summary) {
      summary.likes = row.total;
      summary.isLiked = row.isActive;
    }
  }
  for (const row of commentRows) {
    const summary = summaries.get(row.postId);
    if (summary) summary.comments = row.total;
  }
  for (const row of repostRows) {
    const summary = summaries.get(row.postId);
    if (summary) {
      summary.reposts = row.total;
      summary.isReposted = row.isActive;
    }
  }
  for (const row of bookmarkedRows) {
    const summary = summaries.get(row.postId);
    if (summary) summary.isBookmarked = true;
  }

  return summaries;
}

export async function findCommentInteraction(
  commentId: string,
  viewerId: string | null,
) {
  const [row] = await db
    .select({
      likes: count(),
      isLiked: sql<boolean>`coalesce(bool_or(${feedCommentLikes.accountId} = ${viewerId}), false)`,
    })
    .from(feedCommentLikes)
    .where(eq(feedCommentLikes.commentId, commentId));

  return {
    likes: row?.likes ?? 0,
    isLiked: row?.isLiked ?? false,
  };
}

export async function findCommentInteractionSummaries(
  commentIds: string[],
  viewerId: string | null,
): Promise<Map<string, { likes: number; isLiked: boolean }>> {
  const ids = [...new Set(commentIds)];
  if (ids.length === 0) return new Map();

  const rows = await db
    .select({
      commentId: feedCommentLikes.commentId,
      likes: count(),
      isLiked: sql<boolean>`coalesce(bool_or(${feedCommentLikes.accountId} = ${viewerId}), false)`,
    })
    .from(feedCommentLikes)
    .where(inArray(feedCommentLikes.commentId, ids))
    .groupBy(feedCommentLikes.commentId);

  const summaries = new Map(
    ids.map((commentId) => [
      commentId,
      { likes: 0, isLiked: false },
    ]),
  );
  for (const row of rows) {
    summaries.set(row.commentId, {
      likes: row.likes,
      isLiked: row.isLiked,
    });
  }
  return summaries;
}
