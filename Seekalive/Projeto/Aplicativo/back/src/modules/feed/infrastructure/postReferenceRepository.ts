import { inArray } from "drizzle-orm";
import {
  db,
  feedPostReferences,
  type DatabaseTransaction,
} from "@workspace/db";
import type { SocialPostReference } from "@workspace/api-zod";
import { FeedReferencedPostUnavailableError } from "../domain/feedReferences";

export async function persistPostReference(
  transaction: DatabaseTransaction,
  postId: string,
  reference: SocialPostReference | undefined,
) {
  if (!reference) return;
  try {
    await transaction.insert(feedPostReferences).values({
      postId,
      referenceType: reference.type,
      referenceId: reference.id,
      referencedPostId: reference.id,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23503" &&
      "constraint" in error &&
      error.constraint === "post_references_referenced_post_id_posts_id_fk"
    ) {
      throw new FeedReferencedPostUnavailableError();
    }
    throw error;
  }
}

export async function findPostReferencesByPostIds(postIds: string[]) {
  const uniquePostIds = [...new Set(postIds)];
  if (uniquePostIds.length === 0) {
    return new Map<string, SocialPostReference>();
  }

  const rows = await db
    .select({
      postId: feedPostReferences.postId,
      type: feedPostReferences.referenceType,
      id: feedPostReferences.referenceId,
    })
    .from(feedPostReferences)
    .where(inArray(feedPostReferences.postId, uniquePostIds));

  const references = new Map<string, SocialPostReference>();
  for (const row of rows) {
    if (row.type !== "social_post") {
      throw new Error("Invalid feed post reference type stored in database.");
    }
    references.set(row.postId, { type: row.type, id: row.id });
  }
  return references;
}
