import argon2 from "argon2";
import { logger } from "../../../common/logger";
import {
  fallbackPasswordHashPromise,
  hashPassword,
} from "../application/passwordHashing";
import { createConfirmPasswordUpdate } from "../application/passwordUpdate/confirmPasswordUpdate";
import { createRequestPasswordUpdate } from "../application/passwordUpdate/requestPasswordUpdate";
import { passwordUpdateConfirmationRepository } from "../infrastructure/passwordUpdateConfirmationRepository";
import { passwordUpdateRequestRepository } from "../infrastructure/passwordUpdateRequestRepository";
import { challengeOperations } from "./challenges";

export const passwordUpdateOperations = {
  request: createRequestPasswordUpdate({
    repository: passwordUpdateRequestRepository,
    passwordSecurity: {
      getFallbackPasswordHash: () => fallbackPasswordHashPromise,
      verifyPasswordHash: (passwordHash, password) =>
        argon2.verify(passwordHash, password),
      hashPassword,
    },
    createChallenge: challengeOperations.createPasswordUpdateChallenge,
    invalidateChallenge: challengeOperations.invalidatePasswordUpdateChallenge,
    logger: {
      warn(fields, message) {
        logger.warn(fields, message);
      },
    },
  }),
  confirm: createConfirmPasswordUpdate(passwordUpdateConfirmationRepository),
};
