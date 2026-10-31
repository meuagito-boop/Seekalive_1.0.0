import type { BusinessProfileReview } from "@/modules/profile/commercial-profile/types/businessProfileReview";
import type { User } from "@/modules/profile/types/user";
import type { SeekEvent } from "@/modules/seek/types/event";
import type { SeekDiscoveryItem } from "@/modules/seek/types/discovery";
import { normalizeSeekText } from "./seekFilters";

/** Never substitute unrelated stock photography for an actual merchant's media. */
export function discoveryImage(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, "https://local.invalid");
    if (["picsum.photos", "i.pravatar.cc", "placehold.co", "via.placeholder.com"].includes(url.hostname)) return undefined;
    return ["https:", "http:", "blob:", "data:"].includes(url.protocol) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function buildSeekItems(
  users: User[],
  reviews: BusinessProfileReview[],
  events: (SeekEvent & { isExample?: boolean })[],
  exampleIds: ReadonlySet<string> = new Set(),
): SeekDiscoveryItem[] {
  const accounts = users.filter(user => user.accountType === "commercial" && user.commercialProfile && !user.isBlocked && !user.isPrivate);
  const businesses: SeekDiscoveryItem[] = accounts.map(user => {
    const profile = user.commercialProfile!;
    const actualReviews = reviews.filter(review => review.businessAccountId === user.id
      && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5);
    const isExample = exampleIds.has(user.id);
    return {
      id: user.id,
      accountId: user.id,
      kind: profile.discoveryKind === "provider" || profile.categoryKey === "servicos" ? "provider" : "place",
      name: user.displayName,
      category: profile.category,
      categoryKey: profile.categoryKey,
      description: user.bio,
      image: isExample
        ? user.coverUrl.includes("/demo-seek/") ? discoveryImage(user.coverUrl) : undefined
        : discoveryImage(user.coverUrl) ?? discoveryImage(user.avatarUrl),
      href: `/profile/${encodeURIComponent(user.username)}`,
      region: profile.serviceAreas?.length ? profile.serviceAreas.join(" · ") : user.location || "Região não informada",
      cityId: profile.cityId,
      cityName: profile.cityName,
      cityState: profile.cityState,
      rating: actualReviews.length ? actualReviews.reduce((sum, review) => sum + review.rating, 0) / actualReviews.length : undefined,
      reviewCount: actualReviews.length,
      open: profile.isOpen,
      tags: profile.tags ?? [],
      isExample,
    };
  });
  return [...businesses, ...events.filter(event => {
    // An event cannot impersonate a commercial account that is absent or blocked.
    return !event.organizerId || accounts.some(account => account.id === event.organizerId);
  }).map((event): SeekDiscoveryItem => ({
    id: event.id,
    kind: "event",
    name: event.name,
    category: event.categoryKey,
    categoryKey: event.categoryKey,
    description: event.description ?? "",
    image: event.isExample ? event.img.includes("/demo-seek/") ? discoveryImage(event.img) : undefined : discoveryImage(event.img),
    href: `/seek/event/${encodeURIComponent(event.id)}`,
    region: event.cityName ? `${event.cityName}${event.cityState ? `, ${event.cityState}` : ""}` : "Região não informada",
    cityId: event.cityId,
    cityName: event.cityName,
    cityState: event.cityState,
    reviewCount: 0,
    tags: [event.venue],
    dateLabel: event.date,
    startsAt: event.startsAt,
    priceLabel: event.price,
    free: normalizeSeekText(event.price) === "gratuito" ? true : /^R\$\s*\d/.test(event.price) ? false : undefined,
    isExample: event.isExample === true,
    accountId: event.organizerId,
    organizerName: accounts.find(account => account.id === event.organizerId)?.displayName,
  }))];
}
