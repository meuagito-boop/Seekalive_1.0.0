import type { FeedPost, FeedPostFormat } from "../domain/post";
import type {
  FindFeedAuthors,
  FindPostInteractionSummaries,
  ListFeedPostsByAuthor,
} from "./ports";
import type { PostCursor } from "./postCursor";
import { encodePostCursor } from "./postCursor";
import { canReadPost } from "./postVisibility";
import { toPostView } from "./postView";

const SCAN_BATCH_SIZE = 100;
const MAX_SCANNED_PER_REQUEST = 500;

export function createProfilePostLister(
  listPosts: ListFeedPostsByAuthor,
  findAuthors: FindFeedAuthors,
  findInteractionSummaries: FindPostInteractionSummaries,
) {
  return async function listProfilePosts(
    authorId: string,
    viewerId: string | null,
    limit: number,
    cursor: PostCursor | null,
    format: FeedPostFormat | "all" = "all",
  ) {
    const [author] = await findAuthors([authorId], viewerId);
    if (!author) return null;

    const visiblePosts: FeedPost[] = [];
    let position = cursor;
    let nextCursor: string | null = null;
    let scanned = 0;
    let hasMoreRows = true;

    while (
      visiblePosts.length <= limit &&
      scanned < MAX_SCANNED_PER_REQUEST &&
      hasMoreRows
    ) {
      const batchSize = Math.min(
        SCAN_BATCH_SIZE,
        MAX_SCANNED_PER_REQUEST - scanned,
      );
      const rows = await listPosts({
        authorId,
        format,
        after: position,
        limit: batchSize,
      });

      if (rows.length === 0) {
        hasMoreRows = false;
        break;
      }

      let foundExtraVisiblePost = false;
      for (const post of rows) {
        scanned += 1;
        const previousPosition = position;
        if (canReadPost(post, viewerId, author)) {
          if (visiblePosts.length === limit) {
            nextCursor = previousPosition
              ? encodePostCursor(previousPosition, { authorId, format })
              : null;
            foundExtraVisiblePost = true;
            break;
          }
          visiblePosts.push(post);
        }
        position = { createdAt: post.createdAt, id: post.id };
      }

      if (foundExtraVisiblePost) {
        break;
      }
      hasMoreRows = rows.length === batchSize;
    }

    if (
      !nextCursor &&
      scanned >= MAX_SCANNED_PER_REQUEST &&
      hasMoreRows &&
      position
    ) {
      nextCursor = encodePostCursor(position, { authorId, format });
    }

    const summaries = await findInteractionSummaries(
      visiblePosts.map((post) => post.id),
      viewerId,
    );

    return {
      items: visiblePosts.map((post) =>
        toPostView(post, summaries.get(post.id)),
      ),
      nextCursor,
    };
  };
}

export type ListProfilePosts = ReturnType<typeof createProfilePostLister>;
