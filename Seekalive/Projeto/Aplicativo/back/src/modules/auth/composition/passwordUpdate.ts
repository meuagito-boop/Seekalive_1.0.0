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
import { getAuthEmailDelivery } from "../infrastructure/emailDelivery";
import { challengeOperations } from "./challenges";

const requestPasswordUpdate = createRequestPasswordUpdate({
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
});

export const passwordUpdateOperations = {
  request(rawIdentifier: string, currentPassword: string, newPassword: string) {
    return requestPasswordUpdate(
      rawIdentifier,
      currentPassword,
      newPassword,
      getAuthEmailDelivery(),
    );
  },
  confirm: createConfirmPasswordUpdate(passwordUpdateConfirmationRepository),
};
