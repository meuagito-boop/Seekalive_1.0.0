import type { User } from "@/modules/profile/types/user";

export type AccountDraft = {
  firstName: string;
  lastName: string;
  businessName: string;
  address: string;
  postalCode: string;
  cityName: string;
  stateName: string;
  countryName: string;
};

export const emptyAccountDraft: AccountDraft = {
  firstName: "",
  lastName: "",
  businessName: "",
  address: "",
  postalCode: "",
  cityName: "",
  stateName: "",
  countryName: "",
};

export function draftFromUser(user: User | null): AccountDraft {
  if (!user) return emptyAccountDraft;
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    businessName: user.displayName,
    address: user.address ?? "",
    postalCode: user.postalCode ?? "",
    cityName: user.city ?? "",
    stateName: user.state ?? "",
    countryName: user.country ?? "",
  };
}
