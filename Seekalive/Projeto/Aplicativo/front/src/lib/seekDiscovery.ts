import type { SeekReview, User } from "@/data/mockData";
import type { SeekEvent } from "@/types/seek/event";
import { normalizeSeekText } from "./seekFilters";

export interface DiscoveryLocation {
  id: string;
  label: string;
  city: string;
  state: string;
  source: "manual" | "device";
  latitude?: number;
  longitude?: number;
}

export interface SeekDiscoveryItem {
  id: string;
  kind: "place" | "provider" | "event";
  name: string;
  category: string;
  categoryKey: string;
  description: string;
  image?: string;
  href: string;
  region: string;
  cityId?: string;
  cityName?: string;
  cityState?: string;
  rating?: number;
  reviewCount: number;
  open?: boolean;
  tags: string[];
  dateLabel?: string;
  startsAt?: string;
  priceLabel?: string;
  free?: boolean;
  isExample: boolean;
  accountId?: string;
  organizerName?: string;
}

export interface DiscoveryFilters {
  query: string;
  tab: "explore" | "places" | "providers" | "events";
  category: string;
  minimumRating: number;
  sort: "relevance" | "rating" | "name" | "date";
  onlyOpen: boolean;
  eventPrice: "all" | "free" | "paid";
  eventPeriod: "all" | "upcoming" | "weekend";
  list: boolean;
}

export const defaultDiscoveryFilters: DiscoveryFilters = {
  query: "", tab: "explore", category: "", minimumRating: 0, sort: "relevance",
  onlyOpen: false, eventPrice: "all", eventPeriod: "all", list: false,
};

export function validateDiscoveryFilters(value: unknown): DiscoveryFilters {
  const input = value && typeof value === "object" ? value as Partial<DiscoveryFilters> : {};
  return {
    query: typeof input.query === "string" ? input.query.slice(0, 160) : "",
    tab: ["explore", "places", "providers", "events"].includes(input.tab ?? "") ? input.tab! : "explore",
    category: typeof input.category === "string" ? input.category.slice(0, 80) : "",
    minimumRating: [0, 3, 4, 4.5, 5].includes(input.minimumRating ?? 0) ? input.minimumRating ?? 0 : 0,
    sort: ["relevance", "rating", "name", "date"].includes(input.sort ?? "") ? input.sort! : "relevance",
    onlyOpen: input.onlyOpen === true,
    eventPrice: ["all", "free", "paid"].includes(input.eventPrice ?? "") ? input.eventPrice! : "all",
    eventPeriod: ["all", "upcoming", "weekend"].includes(input.eventPeriod ?? "") ? input.eventPeriod! : "all",
    list: input.list === true,
  };
}

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
  reviews: SeekReview[],
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

export function itemMatchesLocation(item: SeekDiscoveryItem, location: DiscoveryLocation | null) {
  if (!location) return true;
  // Device coordinates cannot be compared with profiles lacking coordinates.
  if (location.source === "device") return false;
  if (item.cityId) return item.cityId === location.id;
  if (item.cityState && normalizeSeekText(item.cityState) !== normalizeSeekText(location.state)) return false;
  if (item.cityName) return normalizeSeekText(item.cityName) === normalizeSeekText(location.city);
  // Existing profiles store a declared region, not a validated street address.
  // Match whole comma-separated city segments, never arbitrary address substrings.
  return item.region.split(/[,·]/).some(part => normalizeSeekText(part) === normalizeSeekText(location.city));
}

function queryTerms(query: string) {
  const ignored = new Set(["de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas", "perto", "mim", "minha", "regiao"]);
  return normalizeSeekText(query).split(" ").filter(term => term && !ignored.has(term));
}

export function filterDiscovery(
  items: SeekDiscoveryItem[],
  filters: DiscoveryFilters,
  location: DiscoveryLocation | null,
  now = new Date(),
) {
  const terms = queryTerms(filters.query);
  const scored = items.filter(item => {
    if (!itemMatchesLocation(item, location)) return false;
    if (filters.tab !== "explore" && item.kind !== ({ places: "place", providers: "provider", events: "event" } as const)[filters.tab]) return false;
    if (filters.category && item.categoryKey !== filters.category) return false;
    if (filters.minimumRating && (item.rating === undefined || item.rating < filters.minimumRating)) return false;
    if (filters.onlyOpen && item.open !== true) return false;
    if (filters.eventPrice !== "all" && (item.kind !== "event" || item.free !== (filters.eventPrice === "free"))) return false;
    if (filters.eventPeriod !== "all") {
      // ISO data with explicit timezone is required; ambiguous legacy date labels aren't parsed.
      if (!item.startsAt || !/(Z|[+-]\d{2}:\d{2})$/.test(item.startsAt)) return false;
      const start = new Date(item.startsAt);
      if (!Number.isFinite(start.getTime()) || start < now) return false;
      if (filters.eventPeriod === "weekend") {
        const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short" }).format(start);
        const calendarDay = (value: Date) => {
          const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
          const part = (kind: string) => Number(date.find(piece => piece.type === kind)?.value);
          return Date.UTC(part("year"), part("month") - 1, part("day"));
        };
        const today = calendarDay(now);
        const endSunday = today + ((7 - new Date(today).getUTCDay()) % 7) * 86400000;
        if (!["Sat", "Sun"].includes(parts) || calendarDay(start) > endSunday) return false;
      }
    }
    const text = normalizeSeekText([item.name, item.category, item.description, item.region, item.cityName, ...item.tags].filter(Boolean).join(" "));
    return terms.every(term => text.includes(term));
  });
  return scored.sort((a, b) => {
    if (filters.sort === "rating") return (b.rating ?? -1) - (a.rating ?? -1) || b.reviewCount - a.reviewCount || a.name.localeCompare(b.name, "pt-BR");
    if (filters.sort === "name") return a.name.localeCompare(b.name, "pt-BR");
    if (filters.sort === "date") {
      const timestamp = (item: SeekDiscoveryItem) => item.startsAt && Number.isFinite(Date.parse(item.startsAt)) ? Date.parse(item.startsAt) : Infinity;
      const difference = timestamp(a) - timestamp(b);
      return (Number.isNaN(difference) ? 0 : difference) || a.name.localeCompare(b.name, "pt-BR");
    }
    const relevance = (item: SeekDiscoveryItem) => terms.reduce((score, term) =>
      score + (normalizeSeekText(item.name).includes(term) ? 3 : normalizeSeekText(item.category).includes(term) ? 2 : 1), 0);
    return relevance(b) - relevance(a) || a.name.localeCompare(b.name, "pt-BR");
  });
}
