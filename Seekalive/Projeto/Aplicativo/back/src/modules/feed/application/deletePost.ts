import type { DeleteOwnedFeedPost } from "./ports";

export function createPostDeleter(deleteOwnedPost: DeleteOwnedFeedPost) {
  return async function deletePost(
    postId: string,
    actorId: string,
  ): Promise<boolean> {
    return deleteOwnedPost(postId, actorId);
  };
}

export type DeletePost = ReturnType<typeof createPostDeleter>;
