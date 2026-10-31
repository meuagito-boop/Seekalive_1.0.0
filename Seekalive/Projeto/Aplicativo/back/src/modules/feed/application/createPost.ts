import type { FeedPost, NewFeedPost } from "../domain/post";
import { assertPostHashtagLimit } from "../domain/postTags";

export type CreatePostCommand = NewFeedPost & {
  mediaAssetIds?: string[];
};

export function createPostCreator(
  persistPost: (command: CreatePostCommand) => Promise<FeedPost>,
) {
  return async function createPost(command: CreatePostCommand) {
    assertPostHashtagLimit(command);
    return persistPost(command);
  };
}

export type CreatePost = ReturnType<typeof createPostCreator>;
