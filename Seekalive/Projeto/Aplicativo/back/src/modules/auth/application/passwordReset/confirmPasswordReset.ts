import { PASSWORD_POLICY_VERSION } from "@workspace/api-zod";
import {
  constantTimeEquals,
  hashPasswordResetCode,
} from "../../../../security/session";
import type {
  PasswordResetConfirmationRepository,
  PasswordResetPasswordSecurity,
} from "./confirmationPorts";

const MAX_PASSWORD_RESET_ATTEMPTS = 5;

export type PasswordResetResult =
  | { kind: "invalid" }
  | { kind: "locked" }
  | { kind: "password_reuse" }
  | { kind: "credentials_changed" }
  | { kind: "updated" };

export function createConfirmPasswordReset(
  repository: PasswordResetConfirmationRepository,
  passwordSecurity: PasswordResetPasswordSecurity,
) {
  return async function confirmPasswordReset(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<PasswordResetResult> {
    const now = new Date();
    const account = await repository.findAccountByEmail(email);

    if (!account || account.status !== "active" || !account.emailVerifiedAt) {
      return { kind: "invalid" };
    }
    if (account.securityLockedAt) return { kind: "locked" };

    const challenge = await repository.findActiveChallenge({
      accountId: account.id,
      now,
      maxAttempts: MAX_PASSWORD_RESET_ATTEMPTS,
    });
    if (!challenge) return { kind: "invalid" };

    const expectedHash = hashPasswordResetCode(account.id, code);
    if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
      await repository.recordInvalidAttempt({
        challengeId: challenge.id,
        now,
        maxAttempts: MAX_PASSWORD_RESET_ATTEMPTS,
      });
      return { kind: "invalid" };
    }

    if (
      await passwordSecurity
        .verifyPasswordHash(account.passwordHash, newPassword)
        .catch(() => false)
    ) {
      return { kind: "password_reuse" };
    }
    const newPasswordHash = await passwordSecurity.hashPassword(newPassword);

    return repository.withTransaction(async (transaction) => {
      if (!(await transaction.lockOwner(account.id))) {
        return { kind: "invalid" as const };
      }

      const consumed = await transaction.consumeChallenge({
        challengeId: challenge.id,
        accountId: account.id,
        tokenHash: challenge.tokenHash,
        now,
        maxAttempts: MAX_PASSWORD_RESET_ATTEMPTS,
      });
      if (!consumed) return { kind: "invalid" as const };

      const credentialUpdated = await transaction.updatePasswordCredential({
        accountId: account.id,
        currentPasswordHash: account.passwordHash,
        newPasswordHash,
        passwordPolicyVersion: PASSWORD_POLICY_VERSION,
        now,
      });
      if (!credentialUpdated) {
        // Return normally so the consumed challenge is committed with the
        // credential-conflict result instead of being rolled back.
        return { kind: "credentials_changed" as const };
      }

      await transaction.revokeSessions(account.id, now);
      await transaction.revokeTrustedDevices(account.id, now);
      await transaction.consumeRelatedChallenges(account.id, now);
      return { kind: "updated" as const };
    });
  };
}
