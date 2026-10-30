import {
  FeedCommentIdempotencyConflict,
  type FeedComment,
} from "../domain/postInteractions";
import type { FindFeedCommentAuthors } from "./ports";
import { toFeedCommentResponse, toFeedCommentView } from "./commentView";
import type { ReadPost } from "./readPost";

export class FeedCommentReplyNotFound extends Error {
  constructor() {
    super("The reply target does not exist on the requested post.");
    this.name = "FeedCommentReplyNotFound";
  }
}

export function createPostCommentCreator(dependencies: {
  readPost: ReadPost;
  findCommentOnPost: (commentId: string, postId: string) => Promise<FeedComment | null>;
  insertComment: (input: {
    postId: string;
    authorId: string;
    clientMutationId: string;
    replyToCommentId: string | null;
    content: string;
  }) => Promise<FeedComment>;
  findAuthors: FindFeedCommentAuthors;
  findInteraction: (commentId: string, viewerId: string) => Promise<{
    likes: number;
    isLiked: boolean;
  }>;
}) {
  return async (input: {
    postId: string;
    authorId: string;
    idempotencyKey: string;
    replyToCommentId: string | null;
    content: string;
  }) => {
    const post = await dependencies.readPost(input.postId, input.authorId);
    if (!post) return null;

    if (
      input.replyToCommentId &&
      !(await dependencies.findCommentOnPost(
        input.replyToCommentId,
        input.postId,
      ))
    ) {
      throw new FeedCommentReplyNotFound();
    }

    const comment = await dependencies.insertComment({
      postId: input.postId,
      authorId: input.authorId,
      clientMutationId: input.idempotencyKey,
      replyToCommentId: input.replyToCommentId,
      content: input.content.trim(),
    });
    const [author] = await dependencies.findAuthors(
      [comment.authorId],
      input.authorId,
    );
    if (!author) return null;
    const interaction = await dependencies.findInteraction(
      comment.id,
      input.authorId,
    );
    return toFeedCommentResponse(
      toFeedCommentView(comment, author, interaction),
    );
  };
}

export type CreatePostComment = ReturnType<typeof createPostCommentCreator>;

