import type {
  PendingAccountInput,
  RegistrationIdentity,
} from "./registrationPorts";

type PersonalRegistration = {
  firstName: string;
  lastName: string;
  age: number;
};

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
