import { createConfirmCurrentEmailChange } from "../application/emailChange/confirmCurrentEmailChange";
import { createConfirmNewEmailChange } from "../application/emailChange/confirmNewEmailChange";
import { createStartEmailChange } from "../application/emailChange/startEmailChange";
import { accountSecurityOperations } from "./accountSecurity";
import { emailChangeRepository } from "../infrastructure/emailChangeRepository";

export const emailChangeOperations = {
  startEmailChange: createStartEmailChange(
    emailChangeRepository,
    accountSecurityOperations,
  ),
  confirmCurrentEmailChange: createConfirmCurrentEmailChange(
    emailChangeRepository,
    accountSecurityOperations,
  ),
  confirmNewEmailChange: createConfirmNewEmailChange(emailChangeRepository),
};
