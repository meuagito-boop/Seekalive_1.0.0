import type { Post } from "@/data/mockData";

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
): ProfileMedia[] {
  return posts
    .filter((post) =>
      post.authorId === accountId &&
      (
        isOwner ||
        (!authorIsPrivate || canViewCirclePosts) &&
        (post.audience === "public" || (canViewCirclePosts && post.audience === "circles"))
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
