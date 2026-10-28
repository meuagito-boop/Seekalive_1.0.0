import { PASSWORD_POLICY_VERSION } from "@workspace/api-zod";
import {
  invalidChallengeMessage,
  MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS,
} from "../accountSecurity/policy";
import {
  constantTimeEquals,
  hashAccountPasswordChangeCode,
} from "../../../../security/tokenHashing";
import type { PasswordChangeConfirmationRepository } from "./confirmationPorts";

export type ConfirmPasswordChangeResult =
  | { kind: "account_unavailable" }
  | { kind: "credentials_changed" }
  | { kind: "invalid"; message: string }
  | { kind: "updated" };

export function createConfirmPasswordChange(
  repository: PasswordChangeConfirmationRepository,
) {
  return async function confirmPasswordChange(
    accountId: string,
    challengeId: string,
    code: string,
  ): Promise<ConfirmPasswordChangeResult> {
    const now = new Date();
    return repository.withTransaction(async (transaction) => {
      const owner = await transaction.lockOwner(accountId);
      if (
        !owner ||
        owner.status !== "active" ||
        !owner.emailVerifiedAt ||
        owner.securityLockedAt
      ) {
        return { kind: "account_unavailable" as const };
      }

      const challenge = await transaction.lockChallenge({
        accountId,
        challengeId,
        now,
        maxAttempts: MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS,
      });
      if (!challenge?.pendingPasswordHash || !challenge.basePasswordHash) {
        return { kind: "invalid" as const, message: invalidChallengeMessage };
      }

      const expectedHash = hashAccountPasswordChangeCode(
        accountId,
        challenge.id,
        code,
      );
      if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
        const attempts = challenge.attempts + 1;
        await transaction.recordInvalidAttempt({
          challengeId: challenge.id,
          clearPasswordMaterial: attempts >= MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS,
        });
        return { kind: "invalid" as const, message: invalidChallengeMessage };
      }

      const consumed = await transaction.consumeChallenge({
        challengeId: challenge.id,
        now,
        maxAttempts: MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS,
      });
      if (!consumed) {
        return { kind: "invalid" as const, message: invalidChallengeMessage };
      }

      const credentialUpdated = await transaction.updatePasswordCredential({
        accountId,
        basePasswordHash: challenge.basePasswordHash,
        pendingPasswordHash: challenge.pendingPasswordHash,
        passwordPolicyVersion: PASSWORD_POLICY_VERSION,
        now,
      });
      if (!credentialUpdated) {
        await transaction.clearChallengePasswordMaterial(challenge.id);
        return { kind: "credentials_changed" as const };
      }

      await transaction.revokeSessions(accountId, now);
      await transaction.revokeTrustedDevices(accountId, now);
      await transaction.consumeRelatedChallenges(accountId, now);
      return { kind: "updated" as const };
    });
  };
}
