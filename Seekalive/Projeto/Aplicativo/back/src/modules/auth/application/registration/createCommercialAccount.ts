import { commercialProfiles } from "@workspace/db";
import type { RegisterRequest } from "@workspace/api-zod";
import { createPendingAccount } from "./createPendingAccount";

type CommercialRegistration = Extract<RegisterRequest, { accountType: "commercial" }>;

export function createCommercialAccount(
  registration: CommercialRegistration,
  identity: { username: string; email: string; passwordHash: string; acceptedTermsVersion: string },
) {
  const businessName = registration.businessName.trim();
  return createPendingAccount({
    ...identity,
    age: registration.age,
    accountType: "commercial",
    displayName: businessName,
    firstName: null,
    lastName: null,
    initializeProfile: async (transaction, accountId) => {
      await transaction.insert(commercialProfiles).values({
        accountId,
        categoryKey: registration.categoryKey,
        discoveryKind: registration.discoveryKind,
        address: registration.address,
        postalCode: registration.postalCode,
        cityName: registration.city,
        stateName: registration.state,
        countryName: registration.country,
      });
    },
  });
}
