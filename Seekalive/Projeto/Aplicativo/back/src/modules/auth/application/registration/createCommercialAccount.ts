import type { RegisterRequest } from "@workspace/api-zod";
import type {
  PendingAccountInput,
  RegistrationIdentity,
} from "./registrationPorts";

type CommercialRegistration = Extract<
  RegisterRequest,
  { accountType: "commercial" }
>;

export function createCommercialAccount(
  registration: CommercialRegistration,
  identity: RegistrationIdentity,
): PendingAccountInput {
  const businessName = registration.businessName.trim();
  return {
    ...identity,
    age: registration.age,
    accountType: "commercial",
    displayName: businessName,
    firstName: null,
    lastName: null,
    commercialProfile: {
      categoryKey: registration.categoryKey,
      discoveryKind: registration.discoveryKind,
      address: registration.address,
      postalCode: registration.postalCode,
      cityName: registration.city,
      stateName: registration.state,
      countryName: registration.country,
    },
  };
}
