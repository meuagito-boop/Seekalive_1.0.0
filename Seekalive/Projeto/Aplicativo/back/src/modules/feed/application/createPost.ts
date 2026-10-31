import type { FeedPost, NewFeedPost } from "../domain/post";

export type CreatePostCommand = NewFeedPost & {
  mediaAssetIds?: string[];
};

export function createPostCreator(
  persistPost: (command: CreatePostCommand) => Promise<FeedPost>,
) {
  return async function createPost(command: CreatePostCommand) {
    return persistPost(command);
  };
}

export type CreatePost = ReturnType<typeof createPostCreator>;
