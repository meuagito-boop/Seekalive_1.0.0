import { and, desc, eq, lt, or } from "drizzle-orm";
import { accountViewsByIds } from "../../accounts/application/accountViews";
import { db, feedPosts } from "@workspace/db";
import type { PostCursor } from "./postCursor";
import { encodePostCursor } from "./postCursor";
import { canReadPost } from "./postVisibility";
import { toPostView } from "./postView";

const SCAN_BATCH_SIZE = 100;
const MAX_SCANNED_PER_REQUEST = 500;

type ProfilePostFormat = "text" | "article" | "all";

export async function listProfilePosts(
  authorId: string,
  viewerId: string | null,
  limit: number,
  cursor: PostCursor | null,
  format: ProfilePostFormat = "all",
) {
  const [author] = await accountViewsByIds([authorId], viewerId);
  if (!author) return null;

  const items: ReturnType<typeof toPostView>[] = [];
  let position = cursor;
  let nextCursor: string | null = null;
  let scanned = 0;
  let hasMoreRows = true;

  while (items.length <= limit && scanned < MAX_SCANNED_PER_REQUEST && hasMoreRows) {
    const conditions = [
      eq(feedPosts.authorId, authorId),
      ...(format === "all" ? [] : [eq(feedPosts.format, format)]),
      ...(position
        ? [or(
            lt(feedPosts.createdAt, position.createdAt),
            and(eq(feedPosts.createdAt, position.createdAt), lt(feedPosts.id, position.id)),
          )!]
        : []),
    ];
    const batchSize = Math.min(SCAN_BATCH_SIZE, MAX_SCANNED_PER_REQUEST - scanned);
    const rows = await db.select().from(feedPosts)
      .where(and(...conditions))
      .orderBy(desc(feedPosts.createdAt), desc(feedPosts.id))
      .limit(batchSize);

    if (rows.length === 0) {
      hasMoreRows = false;
      break;
    }

    let foundExtraVisiblePost = false;
    for (const post of rows) {
      scanned += 1;
      const previousPosition = position;
      if (canReadPost(post, viewerId, author)) {
        if (items.length === limit) {
          nextCursor = previousPosition
            ? encodePostCursor(previousPosition, { authorId, format })
            : null;
          foundExtraVisiblePost = true;
          break;
        }
        items.push(toPostView(post, viewerId));
      }
      position = { createdAt: post.createdAt, id: post.id };
    }

    if (foundExtraVisiblePost) {
      break;
    }
    hasMoreRows = rows.length === batchSize;
  }

  if (!nextCursor && scanned >= MAX_SCANNED_PER_REQUEST && hasMoreRows && position) {
    nextCursor = encodePostCursor(position, { authorId, format });
  }

  return {
    items,
    nextCursor,
  };
}
