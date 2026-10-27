import { createConfirmEmailVerification } from "../application/emailVerification/confirmEmailVerification";
import { createRequestEmailVerification } from "../application/emailVerification/requestEmailVerification";
import { createSendVerificationCode } from "../application/emailVerification/sendVerificationCode";
import { emailVerificationRepository } from "../infrastructure/emailVerificationRepository";

const sendVerificationCode = createSendVerificationCode(
  emailVerificationRepository,
);

export const emailVerificationOperations = {
  sendVerificationCode,
  requestEmailVerification: createRequestEmailVerification(
    emailVerificationRepository,
    sendVerificationCode,
  ),
  confirmEmailVerification: createConfirmEmailVerification(
    emailVerificationRepository,
  ),
};
