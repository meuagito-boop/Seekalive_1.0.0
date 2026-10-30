import type { FeedPost, FeedPostFormat, PostPosition, SocialFeedTab } from "../domain/post";
import type {
  FindPostInteractionSummaries,
  ListFeedFollowingIds,
  ListFeedPostsForTimeline,
} from "./ports";
import type { FeedAuthorAccessView } from "./postVisibility";
import { canReadPost } from "./postVisibility";
import { toPostView } from "./postView";
import {
  encodeGlobalFeedCursor,
  type GlobalFeedCursorScope,
} from "./globalFeedCursor";

const SCAN_BATCH_SIZE = 100;
const MAX_SCANNED_PER_REQUEST = 1000;

export function createGlobalFeedLister<TAuthor extends FeedAuthorAccessView>(
  listPosts: ListFeedPostsForTimeline,
  findAuthors: (
    ids: string[],
    viewerId: string | null,
  ) => Promise<TAuthor[]>,
  findInteractionSummaries: FindPostInteractionSummaries,
  listFollowingIds: ListFeedFollowingIds,
) {
  return async function listGlobalFeed(input: {
    tab: SocialFeedTab;
    viewerId: string | null;
    limit: number;
    cursor: PostPosition | null;
  }) {
    const followingIds =
      input.tab === "following" && input.viewerId
        ? await listFollowingIds(input.viewerId)
        : null;
    const format: FeedPostFormat | "all" =
      input.tab === "articles" ? "article" : "all";
    const scope: GlobalFeedCursorScope = {
      tab: input.tab,
      viewerId: input.viewerId,
    };
    const items: Array<{
      record: FeedPost;
      author: TAuthor;
    }> = [];
    let position = input.cursor;
    let nextCursor: string | null = null;
    let scanned = 0;
    let hasMoreRows = true;

    while (
      items.length <= input.limit &&
      scanned < MAX_SCANNED_PER_REQUEST &&
      hasMoreRows
    ) {
      const batchSize = Math.min(
        SCAN_BATCH_SIZE,
        MAX_SCANNED_PER_REQUEST - scanned,
      );
      const rows = await listPosts({
        authorIds: followingIds,
        format,
        after: position,
        limit: batchSize,
      });
      if (rows.length === 0) {
        hasMoreRows = false;
        break;
      }

      const authors = await findAuthors(
        [...new Set(rows.map((post) => post.authorId))],
        input.viewerId,
      );
      const authorsById = new Map(authors.map((author) => [author.id, author]));
      let foundExtraVisiblePost = false;

      for (const post of rows) {
        scanned += 1;
        const previousPosition = position;
        const author = authorsById.get(post.authorId);
        const isInFollowingFeed =
          input.tab !== "following" ||
          author?.relationship.following === "accepted";
        if (
          isInFollowingFeed &&
          canReadPost(post, input.viewerId, author)
        ) {
          if (items.length === input.limit) {
            if (previousPosition) {
              nextCursor = encodeGlobalFeedCursor(previousPosition, scope);
            }
            foundExtraVisiblePost = true;
            break;
          }
          if (author) items.push({ record: post, author });
        }
        position = { createdAt: post.createdAt, id: post.id };
      }

      if (foundExtraVisiblePost) break;
      hasMoreRows = rows.length === batchSize;
    }

    if (
      !nextCursor &&
      scanned >= MAX_SCANNED_PER_REQUEST &&
      hasMoreRows &&
      position
    ) {
      nextCursor = encodeGlobalFeedCursor(position, scope);
    }

    const summaries = await findInteractionSummaries(
      items.map(({ record }) => record.id),
      input.viewerId,
    );
    return {
      items: items.map(({ record, author }) => ({
        post: toPostView(record, summaries.get(record.id)),
        author,
      })),
      nextCursor,
    };
  };
}
