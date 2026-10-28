import type {
  DiscoveryFilters,
  DiscoveryLocation,
  SeekDiscoveryItem,
} from "@/modules/seek/types/discovery";
import { normalizeSeekText } from "@/modules/seek/utils/seekFilters";

export function itemMatchesLocation(
  item: SeekDiscoveryItem,
  location: DiscoveryLocation | null,
) {
  if (!location) return true;
  // Device coordinates cannot be compared with profiles lacking coordinates.
  if (location.source === "device") return false;
  if (item.cityId) return item.cityId === location.id;
  if (
    item.cityState &&
    normalizeSeekText(item.cityState) !== normalizeSeekText(location.state)
  ) {
    return false;
  }
  if (item.cityName)
    return (
      normalizeSeekText(item.cityName) === normalizeSeekText(location.city)
    );
  // Existing profiles store a declared region, not a validated street address.
  // Match whole comma-separated city segments, never arbitrary address substrings.
  return item.region
    .split(/[,·]/)
    .some(
      (part) => normalizeSeekText(part) === normalizeSeekText(location.city),
    );
}

function queryTerms(query: string) {
  const ignored = new Set([
    "de",
    "do",
    "da",
    "dos",
    "das",
    "em",
    "no",
    "na",
    "nos",
    "nas",
    "perto",
    "mim",
    "minha",
    "regiao",
  ]);
  return normalizeSeekText(query)
    .split(" ")
    .filter((term) => term && !ignored.has(term));
}

export function filterDiscovery(
  items: SeekDiscoveryItem[],
  filters: DiscoveryFilters,
  location: DiscoveryLocation | null,
  now = new Date(),
) {
  const terms = queryTerms(filters.query);
  const matchingItems = items.filter((item) => {
    if (!itemMatchesLocation(item, location)) return false;
    if (
      filters.tab !== "explore" &&
      item.kind !==
        ({ places: "place", providers: "provider", events: "event" } as const)[
          filters.tab
        ]
    ) {
      return false;
    }
    if (filters.category && item.categoryKey !== filters.category) return false;
    if (
      filters.minimumRating &&
      (item.rating === undefined || item.rating < filters.minimumRating)
    ) {
      return false;
    }
    if (filters.onlyOpen && item.open !== true) return false;
    if (
      filters.eventPrice !== "all" &&
      (item.kind !== "event" || item.free !== (filters.eventPrice === "free"))
    ) {
      return false;
    }
    if (filters.eventPeriod !== "all") {
      // ISO data with explicit timezone is required; ambiguous legacy date labels aren't parsed.
      if (!item.startsAt || !/(Z|[+-]\d{2}:\d{2})$/.test(item.startsAt)) {
        return false;
      }
      const start = new Date(item.startsAt);
      if (!Number.isFinite(start.getTime()) || start < now) return false;
      if (filters.eventPeriod === "weekend") {
        const weekday = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Sao_Paulo",
          weekday: "short",
        }).format(start);
        const calendarDay = (value: Date) => {
          const date = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).formatToParts(value);
          const part = (kind: string) =>
            Number(date.find((piece) => piece.type === kind)?.value);
          return Date.UTC(part("year"), part("month") - 1, part("day"));
        };
        const today = calendarDay(now);
        const endSunday =
          today + ((7 - new Date(today).getUTCDay()) % 7) * 86400000;
        if (
          !["Sat", "Sun"].includes(weekday) ||
          calendarDay(start) > endSunday
        ) {
          return false;
        }
      }
    }
    const searchableText = normalizeSeekText(
      [
        item.name,
        item.category,
        item.description,
        item.region,
        item.cityName,
        ...item.tags,
      ]
        .filter(Boolean)
        .join(" "),
    );
    return terms.every((term) => searchableText.includes(term));
  });

  return matchingItems.sort((a, b) => {
    if (filters.sort === "rating") {
      return (
        (b.rating ?? -1) - (a.rating ?? -1) ||
        b.reviewCount - a.reviewCount ||
        a.name.localeCompare(b.name, "pt-BR")
      );
    }
    if (filters.sort === "name") return a.name.localeCompare(b.name, "pt-BR");
    if (filters.sort === "date") {
      const timestamp = (item: SeekDiscoveryItem) =>
        item.startsAt && Number.isFinite(Date.parse(item.startsAt))
          ? Date.parse(item.startsAt)
          : Infinity;
      const difference = timestamp(a) - timestamp(b);
      return (
        (Number.isNaN(difference) ? 0 : difference) ||
        a.name.localeCompare(b.name, "pt-BR")
      );
    }
    const relevance = (item: SeekDiscoveryItem) =>
      terms.reduce(
        (score, term) =>
          score +
          (normalizeSeekText(item.name).includes(term)
            ? 3
            : normalizeSeekText(item.category).includes(term)
              ? 2
              : 1),
        0,
      );
    return relevance(b) - relevance(a) || a.name.localeCompare(b.name, "pt-BR");
  });
}
