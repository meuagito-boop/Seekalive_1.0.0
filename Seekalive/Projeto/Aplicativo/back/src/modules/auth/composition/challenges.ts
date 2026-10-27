import { createDeviceLoginChallenge } from "../application/challenges/deviceLogin";
import { createPasswordResetChallenge } from "../application/challenges/passwordReset";
import { createPasswordUpdateChallenge } from "../application/challenges/passwordUpdate";
import {
  invalidateDeviceLoginChallenge,
  writeDeviceLoginChallenge,
} from "../infrastructure/deviceLoginChallengeRepository";
import {
  invalidatePasswordResetChallenge,
  writePasswordResetChallenge,
} from "../infrastructure/passwordResetChallengeRepository";
import {
  invalidatePasswordUpdateChallenge,
  writePasswordUpdateChallenge,
} from "../infrastructure/passwordUpdateChallengeRepository";

export const challengeOperations = {
  createDeviceLoginChallenge: createDeviceLoginChallenge(
    writeDeviceLoginChallenge,
  ),
  createPasswordResetChallenge: createPasswordResetChallenge(
    writePasswordResetChallenge,
  ),
  createPasswordUpdateChallenge: createPasswordUpdateChallenge(
    writePasswordUpdateChallenge,
  ),
  invalidateDeviceLoginChallenge,
  invalidatePasswordUpdateChallenge,
  invalidatePasswordResetChallenge,
};
