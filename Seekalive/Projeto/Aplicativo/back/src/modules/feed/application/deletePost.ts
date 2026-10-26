import { deleteOwnedFeedPost } from "../infrastructure/postRepository";

export async function deletePost(postId: string, actorId: string): Promise<boolean> {
  return deleteOwnedFeedPost(postId, actorId);
}
