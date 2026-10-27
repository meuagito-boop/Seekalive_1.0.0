import type { NewFeedPost } from "../domain/post";
import type { InsertFeedPost } from "./ports";

export function createPostCreator(insertPost: InsertFeedPost) {
  return async function createPost(command: NewFeedPost) {
    return insertPost(command);
  };
}

export type CreatePost = ReturnType<typeof createPostCreator>;
