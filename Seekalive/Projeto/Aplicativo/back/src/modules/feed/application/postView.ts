import type { feedPosts } from "@workspace/db";

export type FeedPostRow = typeof feedPosts.$inferSelect;

export function toPostView(
  post: FeedPostRow,
  viewerId: string | null,
) {
  return {
    id: post.id,
    authorId: post.authorId,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    audience: post.audience as "public" | "circles" | "private",
    type: "text" as const,
    format: post.format as "text" | "article",
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
