import type { RegisterRequest } from "@workspace/api-zod";
import { createCommercialAccount } from "./createCommercialAccount";
import { createPersonalAccount } from "./createPersonalAccount";
import type {
  RegistrationAccountWriter,
  RegistrationIdentity,
} from "./registrationPorts";

export function createRegistrationAccount(
  accountWriter: RegistrationAccountWriter,
) {
  return (registration: RegisterRequest, identity: RegistrationIdentity) => {
    const accountInput =
      registration.accountType === "personal"
        ? createPersonalAccount(registration, identity)
        : createCommercialAccount(registration, identity);
    return accountWriter.createPendingAccount(accountInput);
  };
}
