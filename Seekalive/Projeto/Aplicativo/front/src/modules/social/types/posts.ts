import type { ContentReference } from "@/modules/app/content/contentReferences";

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
  replyToCommentId?: string | null;
  likes: number;
  isLiked?: boolean;
  author?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface SocialRepost {
  id: string;
  postId: string;
  authorId: string;
  createdAt: string;
}
