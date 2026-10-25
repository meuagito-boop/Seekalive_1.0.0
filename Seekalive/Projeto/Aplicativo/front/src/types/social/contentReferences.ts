export type ReferenceType = "seek_entity" | "shop_item" | "social_post";

export interface ContentReference {
  type: ReferenceType;
  id: string;
}

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
