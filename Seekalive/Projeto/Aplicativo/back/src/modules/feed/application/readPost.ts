import { eq } from "drizzle-orm";
import { db, feedPosts } from "@workspace/db";
import { accountViewsByIds } from "../../accounts/application/accountViews";
import { canReadPost } from "./postVisibility";
import { toPostView } from "./postView";

export async function readPost(postId: string, viewerId: string | null) {
  const [post] = await db.select().from(feedPosts)
    .where(eq(feedPosts.id, postId))
    .limit(1);
  if (!post) return null;

  const [author] = await accountViewsByIds([post.authorId], viewerId);
  if (!canReadPost(post, viewerId, author)) return null;
  return toPostView(post, viewerId);
}
