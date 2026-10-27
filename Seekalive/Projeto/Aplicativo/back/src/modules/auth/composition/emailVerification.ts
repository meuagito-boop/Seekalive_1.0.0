import { createConfirmEmailVerification } from "../application/emailVerification/confirmEmailVerification";
import { createRequestEmailVerification } from "../application/emailVerification/requestEmailVerification";
import { createSendVerificationCode } from "../application/emailVerification/sendVerificationCode";
import { emailVerificationRepository } from "../infrastructure/emailVerificationRepository";
import { getAuthEmailDelivery } from "../infrastructure/emailDelivery";

const sendVerificationCode = createSendVerificationCode(
  emailVerificationRepository,
);
const requestEmailVerification = createRequestEmailVerification(
  emailVerificationRepository,
  sendVerificationCode,
);

export const emailVerificationOperations = {
  isDeliveryConfigured() {
    return getAuthEmailDelivery().isConfigured;
  },
  sendVerificationCode(
    account: { id: string; displayName: string },
    email: string,
  ) {
    return sendVerificationCode(getAuthEmailDelivery(), account, email);
  },
  requestEmailVerification(email: string) {
    return requestEmailVerification(email, getAuthEmailDelivery());
  },
  confirmEmailVerification: createConfirmEmailVerification(
    emailVerificationRepository,
  ),
};
