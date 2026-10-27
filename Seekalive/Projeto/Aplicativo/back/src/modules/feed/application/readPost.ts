import type { FindFeedAuthors, FindFeedPost } from "./ports";
import { canReadPost } from "./postVisibility";
import { toPostView } from "./postView";

export function createPostReader(
  findPost: FindFeedPost,
  findAuthors: FindFeedAuthors,
) {
  return async function readPost(postId: string, viewerId: string | null) {
    const post = await findPost(postId);
    if (!post) return null;

    const [author] = await findAuthors([post.authorId], viewerId);
    if (!canReadPost(post, viewerId, author)) return null;
    return toPostView(post);
  };
}

export type ReadPost = ReturnType<typeof createPostReader>;
