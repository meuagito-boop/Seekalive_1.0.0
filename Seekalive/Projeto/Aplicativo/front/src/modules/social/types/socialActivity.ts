import type { SocialRepost } from "@/modules/social/types/posts";

export interface SocialActivity {
  likedPostIds: string[];
  likedCommentIds: string[];
  bookmarkedPostIds: string[];
  reposts: SocialRepost[];
}
