import type { PostAudience } from "@workspace/api-zod";

export type FeedPostFormat = "text" | "article";
export type SocialFeedTab = "for-you" | "following" | "articles";

export type FeedPost = {
  id: string;
  authorId: string;
  content: string;
  audience: PostAudience;
  format: FeedPostFormat;
  articleTitle: string | null;
  articleBody: string | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

export type NewFeedPost = Pick<
  FeedPost,
  "authorId" | "content" | "audience" | "format"
> & {
  articleTitle?: string | null;
  articleBody?: string | null;
};

export type PostPosition = Pick<FeedPost, "createdAt" | "id">;
