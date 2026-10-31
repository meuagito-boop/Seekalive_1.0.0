import type { FeedPost } from "../domain/post";
import { extractPostHashtags } from "@workspace/api-zod";
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
    hashtags: extractPostHashtags(
      post.content,
      post.articleTitle,
      post.articleBody,
    ),
    createdAt: post.createdAt.toISOString(),
    audience: post.audience,
    type: post.media.some((media) => media.type === "video")
      ? "video" as const
      : "text" as const,
    format: post.format,
    ...(post.media.length > 0
      ? {
          mediaUrls: post.media.map(
            (media) => `/api/v1/social/media/${encodeURIComponent(media.id)}`,
          ),
          mediaTypes: post.media.map((media) => media.type),
        }
      : {}),
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
