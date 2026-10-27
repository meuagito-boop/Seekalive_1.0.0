import { createConfirmDeviceLogin } from "../application/deviceVerification/confirmDeviceLogin";
import { createResendDeviceLoginCode } from "../application/deviceVerification/resendDeviceLoginCode";
import { deviceVerificationRepository } from "../infrastructure/deviceVerificationRepository";

export const deviceVerificationOperations = {
  confirmDeviceLogin: createConfirmDeviceLogin(deviceVerificationRepository),
  resendDeviceLoginCode: createResendDeviceLoginCode(
    deviceVerificationRepository,
  ),
};
