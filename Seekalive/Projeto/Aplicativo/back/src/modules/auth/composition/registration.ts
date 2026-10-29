import { db } from "@workspace/db";
import { createPendingAccountIdentity } from "../../accounts/infrastructure/accountRegistrationRepository";
import { initializeCommercialProfile } from "../../profiles/infrastructure/initializeCommercialProfile";
import { createInitialPasswordCredential } from "../infrastructure/passwordCredentialRegistrationRepository";
import { createRegistrationAvailability } from "../application/registration/registrationAvailability";
import { createRegistrationAccount } from "../application/registration/createRegistrationAccount";
import { createRegistrationAccountCoordinator } from "../infrastructure/registrationAccountCoordinator";
import { registrationAvailabilityRepository } from "../infrastructure/registrationAvailabilityRepository";

const registrationAccountWriter = createRegistrationAccountCoordinator({
  runInTransaction: (work) => db.transaction(work),
  createPendingAccountIdentity,
  createInitialPasswordCredential,
  initializeCommercialProfile,
});

export const createRegistrationAccountService = createRegistrationAccount(
  registrationAccountWriter,
);

export const registrationAvailabilityOperations =
  createRegistrationAvailability(registrationAvailabilityRepository);
