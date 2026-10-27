import { createVerifyCurrentPassword } from "../application/accountSecurity/verifyCurrentPassword";
import { invalidateAuthChallenge } from "../infrastructure/authChallengeRepository";
import { findCurrentPasswordRecord } from "../infrastructure/accountCredentialRepository";

export const accountSecurityOperations = {
  verifyCurrentPassword: createVerifyCurrentPassword(findCurrentPasswordRecord),
  invalidateChallenge: invalidateAuthChallenge,
};
