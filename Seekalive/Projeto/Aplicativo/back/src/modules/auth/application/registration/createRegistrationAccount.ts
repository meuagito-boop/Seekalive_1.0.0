import type { RegisterRequest } from "@workspace/api-zod";
import {
  assessAccountAge,
  type AccountAgeIneligibilityReason,
} from "../../../accounts/domain/accountAgeEligibility";
import { createCommercialAccount } from "./createCommercialAccount";
import { createPersonalAccount } from "./createPersonalAccount";
import type {
  CreatedPendingAccount,
  RegistrationAccountWriter,
  RegistrationIdentity,
} from "./registrationPorts";

export type RegistrationAccountResult =
  | { kind: "created"; account: CreatedPendingAccount }
  | { kind: "username_unavailable" }
  | {
      kind: "age_ineligible";
      reason: AccountAgeIneligibilityReason;
    };

export function createRegistrationAccount(
  accountWriter: RegistrationAccountWriter,
  getCurrentDate: () => Date = () => new Date(),
) {
  return async (
    registration: RegisterRequest,
    identity: RegistrationIdentity,
  ): Promise<RegistrationAccountResult> => {
    const eligibility = assessAccountAge(
      registration.dateOfBirth,
      getCurrentDate(),
    );
    if (eligibility.kind === "ineligible") {
      return { kind: "age_ineligible", reason: eligibility.reason };
    }

    const accountInput =
      registration.accountType === "personal"
        ? createPersonalAccount(
            {
              firstName: registration.firstName,
              lastName: registration.lastName,
              age: eligibility.age,
            },
            identity,
          )
        : createCommercialAccount(
            {
              businessName: registration.businessName,
              age: eligibility.age,
              categoryKey: registration.categoryKey,
              discoveryKind: registration.discoveryKind,
              address: registration.address,
              postalCode: registration.postalCode,
              city: registration.city,
              state: registration.state,
              country: registration.country,
            },
            identity,
          );
    const account = await accountWriter.createPendingAccount(accountInput);
    return account
      ? { kind: "created", account }
      : { kind: "username_unavailable" };
  };
}
