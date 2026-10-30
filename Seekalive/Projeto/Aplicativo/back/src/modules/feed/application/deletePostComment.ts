export function createPostCommentDeleter(
  deleteOwnedComment: (commentId: string, authorId: string) => Promise<boolean>,
) {
  return (commentId: string, authorId: string) =>
    deleteOwnedComment(commentId, authorId);
}

export type DeletePostComment = ReturnType<typeof createPostCommentDeleter>;
