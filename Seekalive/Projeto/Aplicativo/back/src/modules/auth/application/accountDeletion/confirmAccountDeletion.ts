import { hashAccountDeletionCode } from "../../../../security/tokenHashing";
import type { AccountDeletionCodeConfirmer } from "./deletionCodePorts";

export const MAX_ACCOUNT_DELETION_CODE_ATTEMPTS = 3;

export function createConfirmAccountDeletion(
  confirmCode: AccountDeletionCodeConfirmer,
) {
  return async function confirmAccountDeletion(input: {
    accountId: string;
    challengeId: string;
    code: string;
  }) {
    const now = new Date();
    return confirmCode({
      accountId: input.accountId,
      challengeId: input.challengeId,
      purpose: "account_deletion_request",
      tokenHash: hashAccountDeletionCode(
        input.accountId,
        input.challengeId,
        "account_deletion_request",
        input.code,
      ),
      now,
      maximumAttempts: MAX_ACCOUNT_DELETION_CODE_ATTEMPTS,
    });
  };
}
