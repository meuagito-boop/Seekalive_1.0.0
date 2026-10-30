import { and, count, desc, eq, inArray, lt, or } from "drizzle-orm";
import { postAudienceSchema } from "@workspace/api-zod";
import { db, feedPosts } from "@workspace/db";
import type {
  FeedPost,
  FeedPostFormat,
  NewFeedPost,
  PostPosition,
} from "../domain/post";

function toFeedPost(row: typeof feedPosts.$inferSelect): FeedPost {
  const audience = postAudienceSchema.safeParse(row.audience);
  if (!audience.success) {
    throw new Error("Invalid feed post audience stored in database");
  }
  if (row.format !== "text" && row.format !== "article") {
    throw new Error("Invalid feed post format stored in database");
  }
  return {
    ...row,
    audience: audience.data,
    format: row.format,
  };
}

export async function insertFeedPost(input: NewFeedPost): Promise<FeedPost> {
  const [row] = await db.insert(feedPosts).values({
    authorId: input.authorId,
    content: input.content,
    audience: input.audience,
    format: input.format,
    articleTitle: input.articleTitle ?? null,
    articleBody: input.articleBody ?? null,
  }).returning();
  if (!row) throw new Error("Feed post insert returned no row");
  return toFeedPost(row);
}

export async function findFeedPostById(postId: string): Promise<FeedPost | null> {
  const [row] = await db.select().from(feedPosts)
    .where(eq(feedPosts.id, postId))
    .limit(1);
  return row ? toFeedPost(row) : null;
}

export async function deleteOwnedFeedPost(postId: string, actorId: string): Promise<boolean> {
  const deleted = await db.delete(feedPosts)
    .where(and(eq(feedPosts.id, postId), eq(feedPosts.authorId, actorId)))
    .returning({ id: feedPosts.id });
  return deleted.length > 0;
}

export async function countFeedPostsByAuthorIds(authorIds: string[]) {
  const ids = [...new Set(authorIds)];
  if (ids.length === 0) return [];

  return db.select({
    authorId: feedPosts.authorId,
    total: count(),
  })
    .from(feedPosts)
    .where(inArray(feedPosts.authorId, ids))
    .groupBy(feedPosts.authorId);
}

export async function listFeedPostsByAuthor(input: {
  authorId: string;
  format: FeedPostFormat | "all";
  after: PostPosition | null;
  limit: number;
}): Promise<FeedPost[]> {
  const conditions = [
    eq(feedPosts.authorId, input.authorId),
    ...(input.format === "all" ? [] : [eq(feedPosts.format, input.format)]),
  ];
  if (input.after) {
    const cursorCondition = or(
      lt(feedPosts.createdAt, input.after.createdAt),
      and(
        eq(feedPosts.createdAt, input.after.createdAt),
        lt(feedPosts.id, input.after.id),
      ),
    );
    if (cursorCondition) conditions.push(cursorCondition);
  }

  const rows = await db.select().from(feedPosts)
    .where(and(...conditions))
    .orderBy(desc(feedPosts.createdAt), desc(feedPosts.id))
    .limit(input.limit);
  return rows.map(toFeedPost);
}

export async function listFeedPostsForTimeline(input: {
  authorIds: string[] | null;
  format: FeedPostFormat | "all";
  after: PostPosition | null;
  limit: number;
}): Promise<FeedPost[]> {
  const authorIds = input.authorIds
    ? [...new Set(input.authorIds)]
    : null;
  if (authorIds?.length === 0) return [];

  const conditions = [
    ...(authorIds ? [inArray(feedPosts.authorId, authorIds)] : []),
    ...(input.format === "all" ? [] : [eq(feedPosts.format, input.format)]),
  ];
  if (input.after) {
    const cursorCondition = or(
      lt(feedPosts.createdAt, input.after.createdAt),
      and(
        eq(feedPosts.createdAt, input.after.createdAt),
        lt(feedPosts.id, input.after.id),
      ),
    );
    if (cursorCondition) conditions.push(cursorCondition);
  }

  const rows = await db.select().from(feedPosts)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(feedPosts.createdAt), desc(feedPosts.id))
    .limit(input.limit);
  return rows.map(toFeedPost);
}
