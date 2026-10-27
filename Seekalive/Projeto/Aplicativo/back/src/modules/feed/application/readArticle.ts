import type { FeedPostView } from "./postView";

type ReadPost = (
  postId: string,
  viewerId: string | null,
) => Promise<FeedPostView | null>;

export function createArticleReader(readPost: ReadPost) {
  return async function readArticle(postId: string, viewerId: string | null) {
    const post = await readPost(postId, viewerId);
    return post?.format === "article" ? post : null;
  };
}

export type ReadArticle = ReturnType<typeof createArticleReader>;
