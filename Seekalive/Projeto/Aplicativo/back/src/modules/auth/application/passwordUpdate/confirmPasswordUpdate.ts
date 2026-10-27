import { PASSWORD_POLICY_VERSION } from "@workspace/api-zod";
import {
  constantTimeEquals,
  hashPasswordUpdateCode,
} from "../../../../security/session";
import { MAX_PASSWORD_UPDATE_ATTEMPTS } from "../challenges/passwordUpdate";
import type { PasswordUpdateConfirmationRepository } from "./confirmationPorts";

export type PasswordUpdateConfirmResult =
  | { kind: "locked" }
  | { kind: "credentials_changed" }
  | { kind: "invalid" }
  | { kind: "updated" };

export function createConfirmPasswordUpdate(
  repository: PasswordUpdateConfirmationRepository,
) {
  return async function confirmPasswordUpdate(
    challengeId: string,
    code: string,
  ): Promise<PasswordUpdateConfirmResult> {
    const preview = await repository.findChallengeOwner(challengeId);
    if (!preview) return { kind: "invalid" };

    const now = new Date();
    return repository.withTransaction(async (transaction) => {
      const account = await transaction.lockOwner(preview.accountId);
      if (!account || account.status !== "active" || !account.emailVerifiedAt) {
        return { kind: "invalid" as const };
      }
      if (account.securityLockedAt) return { kind: "locked" as const };

      const challenge = await transaction.lockChallenge({
        challengeId,
        accountId: preview.accountId,
        now,
        maxAttempts: MAX_PASSWORD_UPDATE_ATTEMPTS,
      });
      if (
        !challenge ||
        !challenge.pendingPasswordHash ||
        !challenge.basePasswordHash
      ) {
        return { kind: "invalid" as const };
      }

      const expectedHash = hashPasswordUpdateCode(
        preview.accountId,
        challenge.id,
        code,
      );
      if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
        const nextAttempt = challenge.attempts + 1;
        await transaction.recordInvalidAttempt({
          challengeId: challenge.id,
          clearPasswordMaterial: nextAttempt >= MAX_PASSWORD_UPDATE_ATTEMPTS,
        });
        return { kind: "invalid" as const };
      }

      const consumed = await transaction.consumeChallenge({
        challengeId: challenge.id,
        now,
        maxAttempts: MAX_PASSWORD_UPDATE_ATTEMPTS,
      });
      if (!consumed) return { kind: "invalid" as const };

      const credentialUpdated = await transaction.updatePasswordCredential({
        accountId: preview.accountId,
        pendingPasswordHash: challenge.pendingPasswordHash,
        basePasswordHash: challenge.basePasswordHash,
        passwordPolicyVersion: PASSWORD_POLICY_VERSION,
        now,
      });
      if (!credentialUpdated) {
        await transaction.clearChallengePasswordMaterial(challenge.id);
        return { kind: "credentials_changed" as const };
      }

      await transaction.revokeSessions(preview.accountId, now);
      await transaction.revokeTrustedDevices(preview.accountId, now);
      await transaction.consumeRelatedChallenges(preview.accountId, now);
      return { kind: "updated" as const };
    });
  };
}
