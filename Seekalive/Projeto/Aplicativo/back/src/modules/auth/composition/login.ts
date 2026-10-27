import { createAuthenticateLogin } from "../application/login/authenticateLogin";
import { createStartDeviceVerification } from "../application/login/startDeviceVerification";
import { challengeOperations } from "./challenges";
import { loginRepository } from "../infrastructure/loginRepository";
import { getAuthEmailDelivery } from "../infrastructure/emailDelivery";

export const loginOperations = {
  authenticate: createAuthenticateLogin(loginRepository),
  startDeviceVerification: createStartDeviceVerification({
    createChallenge: challengeOperations.createDeviceLoginChallenge,
    invalidateChallenge: challengeOperations.invalidateDeviceLoginChallenge,
    getEmailDelivery: getAuthEmailDelivery,
  }),
};
