import type { WeeklyOpeningHours } from "./businessHours";

export interface CommercialProfile {
  discoveryKind?: "place" | "provider";
  cityId?: string;
  cityName?: string;
  cityState?: string;
  serviceAreas?: string[];
  categoryKey: string;
  category: string;
  address: string;
  distanceKm?: number;
  isOpen?: boolean;
  openingHours?: string;
  weeklyHours?: WeeklyOpeningHours;
  priceLevel?: 1 | 2 | 3 | 4;
  photos?: string[];
  videos?: string[];
  amenities?: string[];
  serviceOptions?: {
    delivery?: boolean;
    dineIn?: boolean;
    tableService?: boolean;
    reservations?: boolean;
    appointments?: boolean;
    takeout?: boolean;
  };
  tags: string[];
}
