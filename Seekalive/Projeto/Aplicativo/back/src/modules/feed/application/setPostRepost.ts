import type { ReadPost } from "./readPost";

export function createPostRepostSetter(
  readPost: ReadPost,
  persistRepost: (postId: string, accountId: string, reposted: boolean) => Promise<void>,
) {
  return async (postId: string, accountId: string, reposted: boolean) => {
    const visiblePost = await readPost(postId, accountId);
    if (!visiblePost) return null;
    await persistRepost(postId, accountId, reposted);
    return readPost(postId, accountId);
  };
}
