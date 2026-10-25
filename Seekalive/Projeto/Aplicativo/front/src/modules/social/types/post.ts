import type { ContentReference } from "@/modules/shared/types/contentReference";
import type { PostFormat } from "./content";

export interface Post {
  id: string;
  authorId: string;
  content: string;
  mediaUrls?: string[];
  mediaTypes?: ("image" | "video")[];
  createdAt: string;
  likes: number;
  comments: number;
  reposts: number;
  shares: number;
  isLiked?: boolean;
  isReposted?: boolean;
  isBookmarked?: boolean;
  audience: "public" | "circles" | "private";
  type: "text" | "video";
  parentPostId?: string;
  format?: PostFormat;
  article?: { title: string; body: string };
  reference?: ContentReference;
  mentions?: string[];
  hashtags?: string[];
}
