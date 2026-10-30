import type { ReadPost } from "./readPost";

export function createPostBookmarkSetter(
  readPost: ReadPost,
  persistBookmark: (postId: string, accountId: string, bookmarked: boolean) => Promise<void>,
) {
  return async (postId: string, accountId: string, bookmarked: boolean) => {
    const visiblePost = await readPost(postId, accountId);
    if (!visiblePost) return null;
    await persistBookmark(postId, accountId, bookmarked);
    return readPost(postId, accountId);
  };
}
