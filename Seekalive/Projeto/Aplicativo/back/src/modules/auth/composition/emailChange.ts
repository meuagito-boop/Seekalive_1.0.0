import { createConfirmCurrentEmailChange } from "../application/emailChange/confirmCurrentEmailChange";
import { createConfirmNewEmailChange } from "../application/emailChange/confirmNewEmailChange";
import { createStartEmailChange } from "../application/emailChange/startEmailChange";
import { accountSecurityOperations } from "./accountSecurity";
import { emailChangeRepository } from "../infrastructure/emailChangeRepository";
import { getAuthEmailDelivery } from "../infrastructure/emailDelivery";

const startEmailChange = createStartEmailChange(
  emailChangeRepository,
  accountSecurityOperations,
);
const confirmCurrentEmailChange = createConfirmCurrentEmailChange(
  emailChangeRepository,
  accountSecurityOperations,
);
const confirmNewEmailChange = createConfirmNewEmailChange(
  emailChangeRepository,
);

export const emailChangeOperations = {
  startEmailChange(
    accountId: string,
    currentPassword: string,
    newEmail: string,
  ) {
    return startEmailChange(
      accountId,
      currentPassword,
      newEmail,
      getAuthEmailDelivery(),
    );
  },
  confirmCurrentEmailChange(
    accountId: string,
    challengeId: string,
    submittedCode: string,
  ) {
    return confirmCurrentEmailChange(
      accountId,
      challengeId,
      submittedCode,
      getAuthEmailDelivery(),
    );
  },
  confirmNewEmailChange(
    accountId: string,
    challengeId: string,
    submittedCode: string,
  ) {
    return confirmNewEmailChange(
      accountId,
      challengeId,
      submittedCode,
      getAuthEmailDelivery(),
    );
  },
};
