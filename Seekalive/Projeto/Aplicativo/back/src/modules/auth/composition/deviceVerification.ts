import { createConfirmDeviceLogin } from "../application/deviceVerification/confirmDeviceLogin";
import { createResendDeviceLoginCode } from "../application/deviceVerification/resendDeviceLoginCode";
import { deviceVerificationRepository } from "../infrastructure/deviceVerificationRepository";
import { getAuthEmailDelivery } from "../infrastructure/emailDelivery";

const resendDeviceLoginCode = createResendDeviceLoginCode(
  deviceVerificationRepository,
);

export const deviceVerificationOperations = {
  confirmDeviceLogin: createConfirmDeviceLogin(deviceVerificationRepository),
  resendDeviceLoginCode(challengeId: string, rawDeviceToken: string) {
    return resendDeviceLoginCode(
      challengeId,
      rawDeviceToken,
      getAuthEmailDelivery(),
    );
  },
};
