import type { ContentReference } from "@/modules/shared/types/contentReference";

export type PostFormat = "text" | "media" | "article";
export type MediaType = "image" | "video";

export interface PublishPostInput {
  authorId: string;
  content: string;
  audience: "public" | "circles" | "private";
  format?: PostFormat;
  article?: { title: string; body: string };
  mediaUrls?: string[];
  mediaTypes?: MediaType[];
  reference?: ContentReference;
}

export interface SocialComment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: string;
  replyToCommentId?: string;
  likes: number;
  isLiked?: boolean;
}

export interface SocialRepost {
  id: string;
  postId: string;
  authorId: string;
  createdAt: string;
}
