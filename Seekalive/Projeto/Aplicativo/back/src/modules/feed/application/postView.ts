import type { FeedPost } from "../domain/post";
import {
  EMPTY_POST_INTERACTION_SUMMARY,
  type PostInteractionSummary,
} from "../domain/postInteractions";

export function toPostView(
  post: FeedPost,
  interactions: PostInteractionSummary = EMPTY_POST_INTERACTION_SUMMARY,
) {
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
    likes: interactions.likes,
    comments: interactions.comments,
    reposts: interactions.reposts,
    shares: 0,
    isLiked: interactions.isLiked,
    isReposted: interactions.isReposted,
    isBookmarked: interactions.isBookmarked,
  };
}

export type FeedPostView = ReturnType<typeof toPostView>;
