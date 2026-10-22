export type ReferenceType = "seek_entity" | "shop_item" | "social_post";
export type PostFormat = "text" | "media" | "article";
export type MediaType = "image" | "video";
export interface ContentReference { type: ReferenceType; id: string }
export interface ReferencePreview extends ContentReference {
  title: string;
  imageUrl?: string;
  subtitle?: string;
  status?: string;
  distanceLabel?: string;
  rating?: number;
  ratingCount?: number;
  price?: string;
  targetPath: string;
  authorName?: string;
  authorAvatarUrl?: string;
  entityLabel?: string;
}
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
export interface SocialRepost { id: string; postId: string; authorId: string; createdAt: string }
export interface ShopItem {
  id: string;
  name: string;
  store: string;
  price?: string;
  oldPrice?: string | null;
  rating?: number;
  reviews?: number;
  tag: string;
  img: string;
  sellerId?: string;
}
export interface SeekEvent {
  cityId?: string;
  cityName?: string;
  cityState?: string;
  startsAt?: string;
  description?: string;
  id: string;
  name: string;
  categoryKey: string;
  date: string;
  venue: string;
  interested: number;
  img: string;
  price: string;
  organizerId?: string;
}
