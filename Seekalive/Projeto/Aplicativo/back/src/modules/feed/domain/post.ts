import type { PostAudience, SocialPostReference } from "@workspace/api-zod";

export type FeedPostFormat = "text" | "media" | "article";
export type SocialFeedTab = "for-you" | "following" | "articles" | "videos";
export type FeedMediaReference = {
  id: string;
  type: "image" | "video";
};

export type FeedPost = {
  id: string;
  authorId: string;
  content: string;
  audience: PostAudience;
  format: FeedPostFormat;
  media: FeedMediaReference[];
  articleTitle: string | null;
  articleBody: string | null;
  reference: SocialPostReference | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
};

export type NewFeedPost = Pick<
  FeedPost,
  "authorId" | "content" | "audience" | "format"
> & {
  media?: FeedMediaReference[];
  articleTitle?: string | null;
  articleBody?: string | null;
  reference?: SocialPostReference;
};

export type PostPosition = Pick<FeedPost, "createdAt" | "id">;
