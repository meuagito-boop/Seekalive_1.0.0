import type { Post, SeekReview, User } from "@/data/mockData";
import type { ContentReference, ReferencePreview } from "@/types/content";
import { demoShopItems } from "@/data/demoCatalog";
import { demoSeekEvents } from "@/data/demoSeekEvents";
import { canReadPost, referenceSchema, ContentServiceError } from "./contentValidation";

export interface ReferenceSnapshot { users: User[]; posts: Post[]; reviews: SeekReview[]; viewerId?: string }
export const referenceKey = (reference: ContentReference) => `${reference.type}:${reference.id}`;
const identities = new WeakMap<object, number>();
let identity = 0;
function keyFor(value: object) {
  if (!identities.has(value)) identities.set(value, ++identity);
  return identities.get(value);
}
const inFlight = new Map<string, Promise<ReferencePreview | null>>();
export function referenceDataVersion(snapshot: ReferenceSnapshot, viewer?: User | null) {
  return `${keyFor(snapshot.posts)}:${keyFor(snapshot.users)}:${keyFor(snapshot.reviews)}:${viewer ? keyFor(viewer) : "anon"}`;
}

function resolveDemo(reference: ContentReference, snapshot: ReferenceSnapshot): ReferencePreview | null {
  if (reference.type === "seek_entity") {
    const business = snapshot.users.find(user => !reference.id.startsWith("event:") && user.id === reference.id && user.accountType === "commercial");
    if (business?.commercialProfile && !business.isBlocked) {
      const profile = business.commercialProfile;
      const reviews = snapshot.reviews.filter(review => review.businessAccountId === business.id);
      return {
        ...reference, title: business.displayName, imageUrl: business.coverUrl || business.avatarUrl,
        subtitle: profile.category, entityLabel: "Estabelecimento",
        targetPath: `/profile/${encodeURIComponent(business.username)}`,
        status: profile.isOpen === undefined ? undefined : profile.isOpen ? "Aberto" : "Fechado",
        distanceLabel: profile.distanceKm === undefined ? undefined : `${profile.distanceKm.toLocaleString("pt-BR")} km`,
        rating: reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : undefined,
        ratingCount: reviews.length || undefined,
      };
    }
    const event = reference.id.startsWith("event:")
      ? demoSeekEvents.find(item => item.id === reference.id.slice("event:".length))
      : undefined;
    return event ? {
      ...reference, title: event.name, subtitle: `${event.date} · ${event.venue}`, imageUrl: event.img,
      entityLabel: "Evento", targetPath: `/seek/event/${encodeURIComponent(event.id)}`,
    } : null;
  }
  if (reference.type === "shop_item") {
    const item = demoShopItems.find(product => product.id === reference.id);
    return item ? {
      ...reference, title: item.name, subtitle: item.store, imageUrl: item.img,
      price: item.price, targetPath: `/shop/item/${encodeURIComponent(item.id)}`, entityLabel: "Item Shop",
    } : null;
  }
  const post = snapshot.posts.find(item => item.id === reference.id);
  if (!post) return null;
  const author = snapshot.users.find(user => user.id === post.authorId);
  if (!author || author.isBlocked || !canReadPost(post, snapshot.viewerId, author.isInCircle ?? false, author.isPrivate ?? false, author.isFollowing ?? false)) return null;
  const imageIndex = post.mediaUrls?.findIndex((_, index) => (post.mediaTypes?.[index] ?? (post.type === "video" ? "video" : "image")) === "image") ?? -1;
  return {
    ...reference, title: post.article?.title ?? post.content.slice(0, 200),
    subtitle: `@${author.username}`, imageUrl: imageIndex >= 0 ? post.mediaUrls?.[imageIndex] : undefined,
    authorName: author.displayName, authorAvatarUrl: author.avatarUrl,
    targetPath: post.format === "article" ? `/article/${encodeURIComponent(post.id)}` : `/post/${encodeURIComponent(post.id)}`,
    entityLabel: post.format === "article" ? "Artigo Social" : "Publicação Social",
  };
}
export function resolveReference(reference: ContentReference, snapshot: ReferenceSnapshot): Promise<ReferencePreview | null> {
  if (!referenceSchema.safeParse(reference).success) return Promise.reject(new ContentServiceError("Referência inválida.", 422));
  const key = `${referenceKey(reference)}:${snapshot.viewerId ?? ""}:${keyFor(snapshot.posts)}:${keyFor(snapshot.users)}:${keyFor(snapshot.reviews)}`;
  const existing = inFlight.get(key);
  if (existing) return existing;
  const result = Promise.resolve().then(() => resolveDemo(reference, snapshot)).finally(() => inFlight.delete(key));
  inFlight.set(key, result);
  return result;
}
