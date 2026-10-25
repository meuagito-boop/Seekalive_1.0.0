import { and, eq } from "drizzle-orm";
import { db, feedPosts } from "@workspace/db";

export async function deletePost(postId: string, actorId: string): Promise<boolean> {
  const deleted = await db.delete(feedPosts)
    .where(and(eq(feedPosts.id, postId), eq(feedPosts.authorId, actorId)))
    .returning({ id: feedPosts.id });
  return deleted.length > 0;
}
