import type { NewFeedPost } from "../domain/post";
import { insertFeedPost } from "../infrastructure/postRepository";

export async function createPost(command: NewFeedPost) {
  return insertFeedPost(command);
}
