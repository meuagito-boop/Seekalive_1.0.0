import type { FeedPost, NewFeedPost } from "../domain/post";
import { FeedReferencedPostUnavailableError } from "../domain/feedReferences";
import { assertPostHashtagLimit } from "../domain/postTags";

export type CreatePostCommand = NewFeedPost & {
  mediaAssetIds?: string[];
};

export function createPostCreator(
  persistPost: (command: CreatePostCommand) => Promise<FeedPost>,
  canReadReferencedPost: (postId: string, viewerId: string) => Promise<boolean>,
) {
  return async function createPost(command: CreatePostCommand) {
    assertPostHashtagLimit(command);
    if (
      command.reference &&
      !(await canReadReferencedPost(command.reference.id, command.authorId))
    ) {
      throw new FeedReferencedPostUnavailableError();
    }
    return persistPost(command);
  };
}

export type CreatePost = ReturnType<typeof createPostCreator>;
