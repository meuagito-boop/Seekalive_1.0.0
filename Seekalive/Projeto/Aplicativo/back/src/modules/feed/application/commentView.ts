import type {
  FeedComment,
  FeedCommentAuthor,
  FeedCommentView,
} from "../domain/postInteractions";

export function toFeedCommentView(
  comment: FeedComment,
  author: FeedCommentAuthor,
  interaction: { likes: number; isLiked: boolean },
): FeedCommentView {
  return {
    id: comment.id,
    postId: comment.postId,
    authorId: comment.authorId,
    replyToCommentId: comment.replyToCommentId,
    content: comment.content,
    createdAt: comment.createdAt,
    likes: interaction.likes,
    isLiked: interaction.isLiked,
    author,
  };
}

export function toFeedCommentResponse(comment: FeedCommentView) {
  return {
    ...comment,
    createdAt: comment.createdAt.toISOString(),
  };
}
