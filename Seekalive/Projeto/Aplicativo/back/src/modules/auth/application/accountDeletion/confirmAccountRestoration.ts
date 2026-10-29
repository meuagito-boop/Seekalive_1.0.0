import { hashAccountDeletionCode } from "../../../../security/tokenHashing";
import type { AccountDeletionCodeConfirmer } from "./deletionCodePorts";
import { MAX_ACCOUNT_DELETION_CODE_ATTEMPTS } from "./confirmAccountDeletion";

export function createConfirmAccountRestoration(
  confirmCode: AccountDeletionCodeConfirmer,
) {
  return async function confirmAccountRestoration(input: {
    accountId: string;
    challengeId: string;
    code: string;
  }) {
    return confirmCode({
      accountId: input.accountId,
      challengeId: input.challengeId,
      purpose: "account_deletion_restore",
      tokenHash: hashAccountDeletionCode(
        input.accountId,
        input.challengeId,
        "account_deletion_restore",
        input.code,
      ),
      now: new Date(),
      maximumAttempts: MAX_ACCOUNT_DELETION_CODE_ATTEMPTS,
    });
  };
}
