import argon2 from "argon2";
import { logger } from "../../../common/logger";
import { hashPassword } from "../application/passwordHashing";
import { createConfirmPasswordReset } from "../application/passwordReset/confirmPasswordReset";
import { createRequestPasswordReset } from "../application/passwordReset/requestPasswordReset";
import { passwordResetConfirmationRepository } from "../infrastructure/passwordResetConfirmationRepository";
import { passwordResetRequestRepository } from "../infrastructure/passwordResetRequestRepository";
import { challengeOperations } from "./challenges";

export const passwordResetOperations = {
  request: createRequestPasswordReset({
    repository: passwordResetRequestRepository,
    createChallenge: challengeOperations.createPasswordResetChallenge,
    invalidateChallenge: challengeOperations.invalidatePasswordResetChallenge,
    logger: {
      warn(fields, message) {
        logger.warn(fields, message);
      },
      error(fields, message) {
        logger.error(fields, message);
      },
    },
  }),
  confirm: createConfirmPasswordReset(passwordResetConfirmationRepository, {
    verifyPasswordHash(passwordHash, password) {
      return argon2.verify(passwordHash, password);
    },
    hashPassword,
  }),
};
