import { commercialProfiles, db } from "@workspace/db";

export type ProfileRegistrationTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type CommercialProfileRegistrationData = {
  categoryKey: string;
  discoveryKind: "place" | "provider";
  address: string;
  postalCode: string;
  cityName: string;
  stateName: string;
  countryName: string;
};

export async function initializeCommercialProfile(
  transaction: ProfileRegistrationTransaction,
  accountId: string,
  profile: CommercialProfileRegistrationData,
): Promise<void> {
  await transaction.insert(commercialProfiles).values({
    accountId,
    ...profile,
  });
}
