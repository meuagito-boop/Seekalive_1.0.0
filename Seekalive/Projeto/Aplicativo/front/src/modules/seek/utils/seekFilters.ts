/** Search treats accents and whitespace consistently across names, categories and addresses. */
export function normalizeSeekText(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
}

export function matchesSeekSearch(values: string[], query: string) {
  const text = normalizeSeekText(values.join(" "));
  return normalizeSeekText(query).split(" ").filter(Boolean).every((term) => text.includes(term));
}

export interface SeekFilterable {
  name: string;
  username: string;
  bio: string;
  category: string;
  categoryKey: string;
  address: string;
  tags: string[];
  open?: boolean;
  rating?: number;
  distanceKm?: number;
}

export function filterSeekBusinesses<T extends SeekFilterable>(businesses: T[], filters: {
  query: string; category: string | null; onlyOpen: boolean; minimumRating: number; maxDistance: number; nearest: boolean;
}): T[] {
  return businesses.filter((business) => {
    if (filters.onlyOpen && business.open !== true) return false;
    if (filters.category && business.categoryKey !== filters.category) return false;
    if (filters.minimumRating > 0 && (business.rating ?? 0) < filters.minimumRating) return false;
    if (filters.maxDistance > 0 && (!Number.isFinite(business.distanceKm) || business.distanceKm! < 0 || business.distanceKm! > filters.maxDistance)) return false;
    return matchesSeekSearch([business.name, business.username, business.bio, business.category, business.address, ...business.tags], filters.query);
  }).sort((a, b) => {
    const distance = (value: number | undefined) => Number.isFinite(value) && value! >= 0 ? value! : Number.MAX_VALUE;
    if (filters.nearest) return distance(a.distanceKm) - distance(b.distanceKm) || a.name.localeCompare(b.name, "pt-BR");
    return (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name, "pt-BR");
  });
}
