import type { RegisterRequest } from "@workspace/api-zod";
import {
  createCommercialAccount,
  type CommercialProfileInitializer,
} from "./createCommercialAccount";
import { createPersonalAccount } from "./createPersonalAccount";
import type { UsernameClaimLocker } from "./createPendingAccount";

type RegistrationIdentity = {
  username: string;
  email: string;
  passwordHash: string;
  acceptedTermsVersion: string;
};

export function createRegistrationAccount(dependencies: {
  lockUsernameClaims: UsernameClaimLocker;
  initializeCommercialProfile: CommercialProfileInitializer;
}) {
  return (registration: RegisterRequest, identity: RegistrationIdentity) => {
    if (registration.accountType === "personal") {
      return createPersonalAccount(registration, identity, {
        lockUsernameClaims: dependencies.lockUsernameClaims,
      });
    }
    return createCommercialAccount(registration, identity, dependencies);
  };
}
