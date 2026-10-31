import { feedPostTags, type DatabaseTransaction } from "@workspace/db";
import { extractPostHashtags, normalizeHashtag } from "@workspace/api-zod";

export async function persistPostHashtags(
  transaction: DatabaseTransaction,
  postId: string,
  fields: Array<string | null | undefined>,
): Promise<void> {
  const tags = extractPostHashtags(...fields).map(normalizeHashtag);
  if (tags.length === 0) return;

  await transaction
    .insert(feedPostTags)
    .values(tags.map((normalizedTag) => ({ postId, normalizedTag })))
    .onConflictDoNothing();
}
