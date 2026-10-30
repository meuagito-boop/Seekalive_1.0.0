import type { FeedComment } from "../domain/postInteractions";
import type { FindFeedCommentAuthors } from "./ports";
import { toFeedCommentResponse, toFeedCommentView } from "./commentView";
import type { ReadPost } from "./readPost";

export function createCommentLikeSetter(dependencies: {
  findComment: (commentId: string) => Promise<FeedComment | null>;
  readPost: ReadPost;
  persistLike: (
    commentId: string,
    accountId: string,
    liked: boolean,
  ) => Promise<void>;
  findAuthors: FindFeedCommentAuthors;
  findInteraction: (
    commentId: string,
    viewerId: string,
  ) => Promise<{ likes: number; isLiked: boolean }>;
}) {
  return async (commentId: string, accountId: string, liked: boolean) => {
    const comment = await dependencies.findComment(commentId);
    if (!comment) return null;
    const readablePost = await dependencies.readPost(comment.postId, accountId);
    if (!readablePost) return null;

    await dependencies.persistLike(commentId, accountId, liked);
    const updated = await dependencies.findComment(commentId);
    if (!updated) return null;
    const [author] = await dependencies.findAuthors(
      [updated.authorId],
      accountId,
    );
    if (!author) return null;
    const interaction = await dependencies.findInteraction(commentId, accountId);
    return toFeedCommentResponse(
      toFeedCommentView(updated, author, interaction),
    );
  };
}

export type SetCommentLike = ReturnType<typeof createCommentLikeSetter>;
