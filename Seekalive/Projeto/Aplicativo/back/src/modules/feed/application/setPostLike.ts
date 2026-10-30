import type { ReadPost } from "./readPost";

export function createPostLikeSetter(
  readPost: ReadPost,
  persistLike: (postId: string, accountId: string, liked: boolean) => Promise<void>,
) {
  return async (postId: string, accountId: string, liked: boolean) => {
    const visiblePost = await readPost(postId, accountId);
    if (!visiblePost) return null;
    await persistLike(postId, accountId, liked);
    return readPost(postId, accountId);
  };
}
