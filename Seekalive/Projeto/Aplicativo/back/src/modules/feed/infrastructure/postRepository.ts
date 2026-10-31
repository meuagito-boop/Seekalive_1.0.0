import { and, count, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { postAudienceSchema } from "@workspace/api-zod";
import { db, feedPostTags, feedPosts } from "@workspace/db";
import { persistPostHashtags } from "./postTagRepository";
import {
  findPostReferencesByPostIds,
  persistPostReference,
} from "./postReferenceRepository";
import type {
  FeedPost,
  FeedPostFormat,
  NewFeedPost,
  PostPosition,
} from "../domain/post";

export function toFeedPost(
  row: typeof feedPosts.$inferSelect,
  reference: FeedPost["reference"] = null,
): FeedPost {
  const audience = postAudienceSchema.safeParse(row.audience);
  if (!audience.success) {
    throw new Error("Invalid feed post audience stored in database");
  }
  if (
    row.format !== "text" &&
    row.format !== "media" &&
    row.format !== "article"
  ) {
    throw new Error("Invalid feed post format stored in database");
  }
  if (
    !Array.isArray(row.media) ||
    row.media.some(
      (item) =>
        !item ||
        typeof item.id !== "string" ||
        (item.type !== "image" && item.type !== "video"),
    )
  ) {
    throw new Error("Invalid feed post media stored in database");
  }
  return {
    ...row,
    audience: audience.data,
    format: row.format,
    reference,
  };
}

export async function insertFeedPost(input: NewFeedPost): Promise<FeedPost> {
  return db.transaction(async (transaction) => {
    const [row] = await transaction.insert(feedPosts).values({
      authorId: input.authorId,
      content: input.content,
      audience: input.audience,
      format: input.format,
      media: input.media ?? [],
      articleTitle: input.articleTitle ?? null,
      articleBody: input.articleBody ?? null,
    }).returning();
    if (!row) throw new Error("Feed post insert returned no row");
    await persistPostHashtags(transaction, row.id, [
      input.content,
      input.articleTitle,
      input.articleBody,
    ]);
    await persistPostReference(transaction, row.id, input.reference);
    return toFeedPost(row, input.reference ?? null);
  });
}

export async function findFeedPostById(postId: string): Promise<FeedPost | null> {
  const [row] = await db.select().from(feedPosts)
    .where(eq(feedPosts.id, postId))
    .limit(1);
  if (!row) return null;
  const references = await findPostReferencesByPostIds([row.id]);
  return toFeedPost(row, references.get(row.id) ?? null);
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
  const references = await findPostReferencesByPostIds(rows.map((row) => row.id));
  return rows.map((row) =>
    toFeedPost(row, references.get(row.id) ?? null),
  );
}

export async function listFeedPostsForTimeline(input: {
  authorIds: string[] | null;
  format: FeedPostFormat | "all";
  videoOnly?: boolean;
  searchTerm?: string;
  hashtagPrefix?: string;
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
    ...(input.videoOnly
      ? [sql`${feedPosts.media} @> '[{"type":"video"}]'::jsonb`]
      : []),
    ...(input.searchTerm
      ? [
          or(
            sql`position(lower(${input.searchTerm}) in lower(${feedPosts.content})) > 0`,
            sql`position(lower(${input.searchTerm}) in lower(coalesce(${feedPosts.articleTitle}, ''))) > 0`,
            sql`position(lower(${input.searchTerm}) in lower(coalesce(${feedPosts.articleBody}, ''))) > 0`,
            ...(input.hashtagPrefix
              ? [
                  sql`exists (
                    select 1
                    from ${feedPostTags}
                    where ${feedPostTags.postId} = ${feedPosts.id}
                      and ${feedPostTags.normalizedTag} like ${`${input.hashtagPrefix.replace(/_/g, "\\_")}%`} escape E'\\\\'
                  )`,
                ]
              : []),
          ),
        ]
      : []),
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
  const references = await findPostReferencesByPostIds(rows.map((row) => row.id));
  return rows.map((row) =>
    toFeedPost(row, references.get(row.id) ?? null),
  );
}
