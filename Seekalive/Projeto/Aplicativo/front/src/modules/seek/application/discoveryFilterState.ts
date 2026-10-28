import type { DiscoveryFilters } from "@/modules/seek/types/discovery";

export const defaultDiscoveryFilters: DiscoveryFilters = {
  query: "",
  tab: "explore",
  category: "",
  minimumRating: 0,
  sort: "relevance",
  onlyOpen: false,
  eventPrice: "all",
  eventPeriod: "all",
  list: false,
};

export function validateDiscoveryFilters(value: unknown): DiscoveryFilters {
  const input =
    value && typeof value === "object"
      ? (value as Partial<DiscoveryFilters>)
      : {};

  return {
    query: typeof input.query === "string" ? input.query.slice(0, 160) : "",
    tab: ["explore", "places", "providers", "events"].includes(input.tab ?? "")
      ? input.tab!
      : "explore",
    category:
      typeof input.category === "string" ? input.category.slice(0, 80) : "",
    minimumRating: [0, 3, 4, 4.5, 5].includes(input.minimumRating ?? 0)
      ? (input.minimumRating ?? 0)
      : 0,
    sort: ["relevance", "rating", "name", "date"].includes(input.sort ?? "")
      ? input.sort!
      : "relevance",
    onlyOpen: input.onlyOpen === true,
    eventPrice: ["all", "free", "paid"].includes(input.eventPrice ?? "")
      ? input.eventPrice!
      : "all",
    eventPeriod: ["all", "upcoming", "weekend"].includes(
      input.eventPeriod ?? "",
    )
      ? input.eventPeriod!
      : "all",
    list: input.list === true,
  };
}
