import type { AccountPatch, MyAccountResponse } from "@workspace/api-client-react";
import type { DiscoveryLocation } from "@/modules/seek/types/discovery";
import type { User } from "@/modules/profile/types/user";
import type { WeeklyOpeningHours } from "@/modules/profile/commercial-profile/types/businessHours";
import { buildCommonProfilePatch, normalizeProfileEditUsername } from "@/modules/profile/utils/commonProfileEdit";
import type { ProfileEditFormValues } from "@/modules/profile/types/profileEditSchema";
import { serviceValue } from "@/modules/profile/types/profileEditSchema";

export function validateCommercialProfileName(
  values: ProfileEditFormValues,
): boolean {
  return values.displayName.trim().length >= 2;
}

export function buildCommercialProfilePatch(
  values: ProfileEditFormValues,
  current: MyAccountResponse,
  discoveryCity: DiscoveryLocation | null,
  usernameChanged: boolean,
): AccountPatch {
  const patch = buildCommonProfilePatch(values, current, usernameChanged);
  if (values.displayName.trim() !== current.account.displayName) {
    patch.displayName = values.displayName.trim();
  }

  const currentCommercial = current.commercialProfile;
  if (currentCommercial) {
    const nextAddress = values.businessAddress?.trim() || currentCommercial.address;
    const nextCity = discoveryCity?.city ?? currentCommercial.cityName;
    const nextState = discoveryCity?.state ?? currentCommercial.stateName;
    if (
      nextAddress !== currentCommercial.address
      || nextCity !== currentCommercial.cityName
      || nextState !== currentCommercial.stateName
    ) {
      patch.commercialProfile = {
        address: nextAddress,
        postalCode: currentCommercial.postalCode,
        cityName: nextCity,
        stateName: nextState,
        countryName: currentCommercial.countryName,
      };
    }
  }

  return patch;
}

export function buildCommercialPreviewUser(
  values: ProfileEditFormValues,
  current: User,
  discoveryCity: DiscoveryLocation | null,
  weeklyHours: WeeklyOpeningHours | undefined,
  openingHours: string | undefined,
): User {
  return {
    ...current,
    firstName: values.firstName,
    lastName: values.lastName,
    displayName: values.displayName.trim(),
    username: normalizeProfileEditUsername(values.username),
    bio: values.bio,
    location: values.location || undefined,
    website: values.website || undefined,
    commercialProfile: current.commercialProfile
      ? {
          ...current.commercialProfile,
          cityId: discoveryCity?.id,
          cityName: discoveryCity?.city,
          cityState: discoveryCity?.state,
          address: values.businessAddress?.trim() || current.commercialProfile.address,
          weeklyHours,
          openingHours,
          priceLevel: values.priceLevel
            ? Number(values.priceLevel) as 1 | 2 | 3 | 4
            : undefined,
          serviceOptions: {
            delivery: serviceValue(values.serviceDelivery),
            dineIn: serviceValue(values.serviceDineIn),
            tableService: serviceValue(values.serviceTableService),
            reservations: serviceValue(values.serviceReservations),
            appointments: serviceValue(values.serviceAppointments),
            takeout: serviceValue(values.serviceTakeout),
          },
        }
      : undefined,
  };
}
