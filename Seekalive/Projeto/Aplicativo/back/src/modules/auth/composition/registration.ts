import { usernameClaimLocks } from "../../accounts/composition/publicApi";
import { initializeCommercialProfile } from "../../profiles/infrastructure/initializeCommercialProfile";
import { createRegistrationAvailability } from "../application/registration/registrationAvailability";
import { createRegistrationAccount } from "../application/registration/createRegistrationAccount";
import { createRegistrationAccountRepository } from "../infrastructure/registrationAccountRepository";
import { registrationAvailabilityRepository } from "../infrastructure/registrationAvailabilityRepository";

const registrationAccountWriter = createRegistrationAccountRepository({
  lockUsernameClaims: usernameClaimLocks.lock,
  initializeCommercialProfile,
});

export const createRegistrationAccountService = createRegistrationAccount(
  registrationAccountWriter,
);

export const registrationAvailabilityOperations =
  createRegistrationAvailability(registrationAvailabilityRepository);
