import type { User } from "@/modules/profile/types/user";
import type { AccountDraft } from "@/modules/settings/types/accountSettings";

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

export function accountDraftFromUser(user: User | null): AccountDraft {
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
