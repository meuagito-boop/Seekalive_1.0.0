import type { RegisterRequest } from "@workspace/api-zod";
import { createPendingAccount } from "./createPendingAccount";

type PersonalRegistration = Extract<RegisterRequest, { accountType: "personal" }>;

export function createPersonalAccount(
  registration: PersonalRegistration,
  identity: { username: string; email: string; passwordHash: string; acceptedTermsVersion: string },
) {
  const firstName = registration.firstName.trim();
  const lastName = registration.lastName.trim();
  return createPendingAccount({
    ...identity,
    age: registration.age,
    accountType: "personal",
    displayName: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
  });
}
