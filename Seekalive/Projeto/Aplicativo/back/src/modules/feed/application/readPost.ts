import { accountViewsByIds } from "../../accounts/application/accountViews";
import { findFeedPostById } from "../infrastructure/postRepository";
import { canReadPost } from "./postVisibility";
import { toPostView } from "./postView";

export async function readPost(postId: string, viewerId: string | null) {
  const post = await findFeedPostById(postId);
  if (!post) return null;

  const [author] = await accountViewsByIds([post.authorId], viewerId);
  if (!canReadPost(post, viewerId, author)) return null;
  return toPostView(post);
}
