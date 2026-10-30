import { and, asc, eq, gt, or } from "drizzle-orm";
import { db, feedPostComments } from "@workspace/db";
import type {
  CommentPosition,
  FeedComment,
} from "../domain/postInteractions";
import { FeedCommentIdempotencyConflict } from "../domain/postInteractions";

function toFeedComment(
  row: typeof feedPostComments.$inferSelect,
): FeedComment {
  return {
    id: row.id,
    postId: row.postId,
    authorId: row.authorId,
    clientMutationId: row.clientMutationId,
    replyToCommentId: row.replyToCommentId,
    content: row.content,
    createdAt: row.createdAt,
  };
}

export async function createFeedPostComment(input: {
  postId: string;
  authorId: string;
  clientMutationId: string;
  replyToCommentId: string | null;
  content: string;
}): Promise<FeedComment> {
  const [inserted] = await db
    .insert(feedPostComments)
    .values(input)
    .onConflictDoNothing({
      target: [
        feedPostComments.authorId,
        feedPostComments.clientMutationId,
      ],
    })
    .returning();

  if (inserted) return toFeedComment(inserted);

  const [existing] = await db
    .select()
    .from(feedPostComments)
    .where(
      and(
        eq(feedPostComments.authorId, input.authorId),
        eq(feedPostComments.clientMutationId, input.clientMutationId),
      ),
    )
    .limit(1);
  if (!existing) {
    throw new Error("Comment idempotency conflict returned no existing row.");
  }
  if (
    existing.postId !== input.postId ||
    existing.content !== input.content ||
    existing.replyToCommentId !== input.replyToCommentId
  ) {
    throw new FeedCommentIdempotencyConflict();
  }
  return toFeedComment(existing);
}

export async function findFeedPostComment(
  commentId: string,
): Promise<FeedComment | null> {
  const [row] = await db
    .select()
    .from(feedPostComments)
    .where(eq(feedPostComments.id, commentId))
    .limit(1);
  return row ? toFeedComment(row) : null;
}

export async function findFeedPostCommentOnPost(
  commentId: string,
  postId: string,
): Promise<FeedComment | null> {
  const [row] = await db
    .select()
    .from(feedPostComments)
    .where(
      and(
        eq(feedPostComments.id, commentId),
        eq(feedPostComments.postId, postId),
      ),
    )
    .limit(1);
  return row ? toFeedComment(row) : null;
}

export async function listFeedPostComments(input: {
  postId: string;
  after: CommentPosition | null;
  limit: number;
}): Promise<FeedComment[]> {
  const conditions = [eq(feedPostComments.postId, input.postId)];
  if (input.after) {
    const cursorCondition = or(
      gt(feedPostComments.createdAt, input.after.createdAt),
      and(
        eq(feedPostComments.createdAt, input.after.createdAt),
        gt(feedPostComments.id, input.after.id),
      ),
    );
    if (cursorCondition) conditions.push(cursorCondition);
  }

  const rows = await db
    .select()
    .from(feedPostComments)
    .where(and(...conditions))
    .orderBy(asc(feedPostComments.createdAt), asc(feedPostComments.id))
    .limit(input.limit);
  return rows.map(toFeedComment);
}

export async function deleteOwnedFeedPostComment(
  commentId: string,
  authorId: string,
): Promise<boolean> {
  const deleted = await db
    .delete(feedPostComments)
    .where(
      and(
        eq(feedPostComments.id, commentId),
        eq(feedPostComments.authorId, authorId),
      ),
    )
    .returning({ id: feedPostComments.id });
  return deleted.length > 0;
}
