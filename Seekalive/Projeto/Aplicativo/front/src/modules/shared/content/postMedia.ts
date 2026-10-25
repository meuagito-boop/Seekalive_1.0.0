import type { Post } from "@/modules/social/types/post";
import { canReadPost } from "@/modules/shared/content/contentValidation";

export type PostMediaType = "image" | "video";

export interface ProfileMedia {
  id: string;
  url: string;
  type: PostMediaType;
}

export function getPostMediaType(post: Post, index: number): PostMediaType {
  return post.mediaTypes?.[index] ?? (post.type === "video" ? "video" : "image");
}

export function getProfileMedia(
  posts: Post[],
  accountId: string,
  isOwner = false,
  canViewCirclePosts = false,
  authorIsPrivate = false,
  approvedFollower = false,
): ProfileMedia[] {
  return posts
    .filter((post) =>
      post.authorId === accountId &&
      canReadPost(
        post,
        isOwner ? accountId : undefined,
        canViewCirclePosts,
        authorIsPrivate,
        approvedFollower,
      ),
    )
    .flatMap((post) =>
      (post.mediaUrls ?? []).map((url, index) => ({
        id: `${post.id}-${index}`,
        url,
        type: getPostMediaType(post, index),
      })),
    );
}
