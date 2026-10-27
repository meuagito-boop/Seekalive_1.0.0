import { usernameClaimLocks } from "../../accounts/composition/publicApi";
import { initializeCommercialProfile } from "../../profiles/infrastructure/initializeCommercialProfile";
import { createRegistrationAccount } from "../application/registration/createRegistrationAccount";

export const createRegistrationAccountService = createRegistrationAccount({
  lockUsernameClaims: usernameClaimLocks.lock,
  initializeCommercialProfile,
});
