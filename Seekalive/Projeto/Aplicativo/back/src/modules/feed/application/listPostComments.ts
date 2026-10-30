import type { FeedComment } from "../domain/postInteractions";
import type {
  FindFeedCommentAuthors,
  ListFeedPostComments,
} from "./ports";
import { encodeCommentCursor } from "./postInteractionCursors";
import { toFeedCommentResponse, toFeedCommentView } from "./commentView";
import type { ReadPost } from "./readPost";

export function createPostCommentLister(dependencies: {
  readPost: ReadPost;
  listComments: ListFeedPostComments;
  findAuthors: FindFeedCommentAuthors;
  findInteractions: (
    commentIds: string[],
    viewerId: string,
  ) => Promise<Map<string, { likes: number; isLiked: boolean }>>;
}) {
  return async (
    postId: string,
    viewerId: string,
    limit: number,
    cursor: { createdAt: Date; id: string } | null,
  ) => {
    const post = await dependencies.readPost(postId, viewerId);
    if (!post) return null;

    const rows = await dependencies.listComments({
      postId,
      after: cursor,
      limit: limit + 1,
    });
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const authors = await dependencies.findAuthors(
      [...new Set(pageRows.map((comment) => comment.authorId))],
      viewerId,
    );
    const authorById = new Map(authors.map((author) => [author.id, author]));
    const interactions = await dependencies.findInteractions(
      pageRows.map((comment) => comment.id),
      viewerId,
    );
    const items = pageRows.flatMap((comment: FeedComment) => {
      const author = authorById.get(comment.authorId);
      if (!author) return [];
      return [
        toFeedCommentResponse(
          toFeedCommentView(
            comment,
            author,
            interactions.get(comment.id) ?? { likes: 0, isLiked: false },
          ),
        ),
      ];
    });
    const lastItem = pageRows.at(-1);

    return {
      items,
      nextCursor:
        hasMore && lastItem
          ? encodeCommentCursor(
              { createdAt: lastItem.createdAt, id: lastItem.id },
              { postId },
            )
          : null,
    };
  };
}

export type ListPostComments = ReturnType<typeof createPostCommentLister>;
