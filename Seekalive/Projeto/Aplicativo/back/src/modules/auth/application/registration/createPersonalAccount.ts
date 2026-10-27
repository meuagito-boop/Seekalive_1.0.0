import type { RegisterRequest } from "@workspace/api-zod";
import type {
  PendingAccountInput,
  RegistrationIdentity,
} from "./registrationPorts";

type PersonalRegistration = Extract<
  RegisterRequest,
  { accountType: "personal" }
>;

export function createPersonalAccount(
  registration: PersonalRegistration,
  identity: RegistrationIdentity,
): PendingAccountInput {
  const firstName = registration.firstName.trim();
  const lastName = registration.lastName.trim();
  return {
    ...identity,
    age: registration.age,
    accountType: "personal",
    displayName: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
  };
}
