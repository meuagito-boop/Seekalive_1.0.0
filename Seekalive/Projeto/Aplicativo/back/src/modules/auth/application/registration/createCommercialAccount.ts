import type { RegisterRequest } from "@workspace/api-zod";
import type { CommercialProfileRegistrationData } from "../../../profiles/domain/commercialProfileRegistration";
import {
  createPendingAccount,
  type AccountRegistrationTransaction,
  type UsernameClaimLocker,
} from "./createPendingAccount";

type CommercialRegistration = Extract<
  RegisterRequest,
  { accountType: "commercial" }
>;

export type CommercialProfileInitializer = (
  transaction: AccountRegistrationTransaction,
  accountId: string,
  profile: CommercialProfileRegistrationData,
) => Promise<void>;

export function createCommercialAccount(
  registration: CommercialRegistration,
  identity: {
    username: string;
    email: string;
    passwordHash: string;
    acceptedTermsVersion: string;
  },
  dependencies: {
    lockUsernameClaims: UsernameClaimLocker;
    initializeCommercialProfile: CommercialProfileInitializer;
  },
) {
  const businessName = registration.businessName.trim();
  return createPendingAccount(
    {
      ...identity,
      age: registration.age,
      accountType: "commercial",
      displayName: businessName,
      firstName: null,
      lastName: null,
      initializeProfile: (transaction, accountId) =>
        dependencies.initializeCommercialProfile(transaction, accountId, {
          categoryKey: registration.categoryKey,
          discoveryKind: registration.discoveryKind,
          address: registration.address,
          postalCode: registration.postalCode,
          cityName: registration.city,
          stateName: registration.state,
          countryName: registration.country,
        }),
    },
    dependencies.lockUsernameClaims,
  );
}
