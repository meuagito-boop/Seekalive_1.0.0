import type { RegisterRequest } from "@workspace/api-zod";
import { createCommercialAccount } from "./createCommercialAccount";
import { createPersonalAccount } from "./createPersonalAccount";

type RegistrationIdentity = {
  username: string;
  email: string;
  passwordHash: string;
  acceptedTermsVersion: string;
};

export function createRegistrationAccount(
  registration: RegisterRequest,
  identity: RegistrationIdentity,
) {
  if (registration.accountType === "personal") {
    return createPersonalAccount(registration, identity);
  }
  return createCommercialAccount(registration, identity);
}
