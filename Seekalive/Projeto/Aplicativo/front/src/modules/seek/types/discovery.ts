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
