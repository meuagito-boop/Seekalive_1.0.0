import { createConfirmPasswordChange } from "../application/passwordChange/confirmPasswordChange";
import { createRequestPasswordChange } from "../application/passwordChange/requestPasswordChange";
import { accountSecurityOperations } from "./accountSecurity";
import { getAuthEmailDelivery } from "../infrastructure/emailDelivery";
import { passwordChangeConfirmationRepository } from "../infrastructure/passwordChangeConfirmationRepository";
import { passwordChangeRequestRepository } from "../infrastructure/passwordChangeRequestRepository";

export const passwordChangeOperations = {
  request: createRequestPasswordChange({
    repository: passwordChangeRequestRepository,
    security: accountSecurityOperations,
    getEmailDelivery: getAuthEmailDelivery,
  }),
  confirm: createConfirmPasswordChange(passwordChangeConfirmationRepository),
};
