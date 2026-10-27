import type { FeedPost } from "../domain/post";

export function toPostView(post: FeedPost) {
  return {
    id: post.id,
    authorId: post.authorId,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    audience: post.audience,
    type: "text" as const,
    format: post.format,
    ...(post.format === "article" && post.articleTitle && post.articleBody
      ? { article: { title: post.articleTitle, body: post.articleBody } }
      : {}),
    likes: 0,
    comments: 0,
    reposts: 0,
    shares: 0,
    isLiked: false,
    isReposted: false,
  };
}

export type FeedPostView = ReturnType<typeof toPostView>;
