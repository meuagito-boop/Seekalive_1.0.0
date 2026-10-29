import { createConfirmAccountDeletion } from "../application/accountDeletion/confirmAccountDeletion";
import { createConfirmAccountRestoration } from "../application/accountDeletion/confirmAccountRestoration";
import { createRequestAccountDeletionCode } from "../application/accountDeletion/requestAccountDeletionCode";
import { createRequestAccountRestorationCode } from "../application/accountDeletion/requestAccountRestorationCode";
import { isAccountDeletionSchemaReady } from "../infrastructure/accountDeletionSchemaStatus";
import {
  confirmAccountDeletionCode,
  invalidateAccountDeletionChallenge,
  writeAccountDeletionChallenge,
} from "../infrastructure/accountDeletionRepository";
import { getAuthEmailDelivery } from "../infrastructure/emailDelivery";

export const accountDeletionOperations = {
  isSchemaReady: isAccountDeletionSchemaReady,
  requestCode: createRequestAccountDeletionCode({
    writeChallenge: writeAccountDeletionChallenge,
    invalidateChallenge: invalidateAccountDeletionChallenge,
    getEmailDelivery: getAuthEmailDelivery,
  }),
  requestRestorationCode: createRequestAccountRestorationCode({
    writeChallenge: writeAccountDeletionChallenge,
    invalidateChallenge: invalidateAccountDeletionChallenge,
    getEmailDelivery: getAuthEmailDelivery,
  }),
  confirm: createConfirmAccountDeletion(confirmAccountDeletionCode),
  confirmRestoration: createConfirmAccountRestoration(
    confirmAccountDeletionCode,
  ),
};
