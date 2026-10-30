import type {
  FindFeedAuthors,
  FindFeedPost,
  FindPostInteractionSummaries,
} from "./ports";
import { canReadPost } from "./postVisibility";
import { toPostView } from "./postView";

export function createPostReader(
  findPost: FindFeedPost,
  findAuthors: FindFeedAuthors,
  findInteractionSummaries: FindPostInteractionSummaries,
) {
  return async function readPost(postId: string, viewerId: string | null) {
    const post = await findPost(postId);
    if (!post) return null;

    const [author] = await findAuthors([post.authorId], viewerId);
    if (!canReadPost(post, viewerId, author)) return null;
    const summaries = await findInteractionSummaries([post.id], viewerId);
    return toPostView(post, summaries.get(post.id));
  };
}

export type ReadPost = ReturnType<typeof createPostReader>;
