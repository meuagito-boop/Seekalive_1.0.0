import { MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS } from "../accountSecurity/policy";
import { EmailAddressConflictError } from "./errors";
import { maskEmail } from "../emailMasking";
import {
  constantTimeEquals,
  hashAccountEmailChangeCode,
} from "../../../../security/tokenHashing";
import { logger } from "../../../../common/logger";
import type { EmailChangeDelivery, EmailChangeRepository } from "./ports";

type ConfirmNewEmailTransactionResult =
  | { kind: "account_unavailable" }
  | { kind: "invalid" }
  | { kind: "email_unavailable" }
  | { kind: "email_unchanged" }
  | { kind: "updated"; oldEmail: string; email: string; displayName: string };

export type ConfirmNewEmailChangeResult =
  | { kind: "account_unavailable" }
  | { kind: "invalid" }
  | { kind: "email_unavailable" }
  | { kind: "email_unchanged" }
  | { kind: "updated"; email: string; securityNoticeSent: boolean };

export function createConfirmNewEmailChange(repository: EmailChangeRepository) {
  return async function confirmNewEmailChange(
    accountId: string,
    challengeId: string,
    submittedCode: string,
    delivery: EmailChangeDelivery,
  ): Promise<ConfirmNewEmailChangeResult> {
    const now = new Date();
    let result: ConfirmNewEmailTransactionResult;
    try {
      result = await repository.withTransaction(async (tx) => {
        const owner = await tx.lockOwner(accountId);
        if (
          !owner ||
          owner.status !== "active" ||
          !owner.emailVerifiedAt ||
          owner.securityLockedAt
        ) {
          return { kind: "account_unavailable" };
        }

        const challenge = await tx.lockActiveChallenge({
          accountId,
          challengeId,
          purpose: "account_email_change_new",
          now,
          maxAttempts: MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS,
        });
        if (!challenge?.pendingEmail) return { kind: "invalid" };

        const expectedHash = hashAccountEmailChangeCode(
          accountId,
          challenge.id,
          "account_email_change_new",
          submittedCode,
        );
        if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
          await tx.recordInvalidCode({
            challengeId: challenge.id,
            now,
            maxAttempts: MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS,
            clearPendingEmail:
              challenge.attempts + 1 >= MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS,
          });
          return { kind: "invalid" };
        }

        if (challenge.pendingEmail === owner.email) {
          await tx.consumeCurrentEmailChallenge(challenge.id, now);
          return { kind: "email_unchanged" };
        }
        if (await tx.isEmailInUse(challenge.pendingEmail)) {
          await tx.consumeCurrentEmailChallenge(challenge.id, now);
          return { kind: "email_unavailable" };
        }

        const consumed = await tx.consumeNewEmailChallenge({
          challengeId: challenge.id,
          now,
          maxAttempts: MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS,
        });
        if (!consumed) return { kind: "invalid" };

        const email = await tx.updateVerifiedEmail({
          accountId,
          email: challenge.pendingEmail,
          now,
        });
        if (!email) return { kind: "account_unavailable" };

        await tx.incrementAccountVersion(accountId, now);
        await tx.consumeAllActiveSecurityChallenges(accountId, now);
        return {
          kind: "updated",
          oldEmail: owner.email,
          email,
          displayName: owner.displayName,
        };
      });
    } catch (error) {
      if (error instanceof EmailAddressConflictError) {
        return { kind: "email_unavailable" };
      }
      throw error;
    }

    if (result.kind === "invalid") {
      return { kind: "invalid" };
    }
    if (result.kind !== "updated") return result;

    let securityNoticeSent = true;
    try {
      await delivery.sendAccountEmailChangeSecurityNotice({
        email: result.oldEmail,
        displayName: result.displayName,
        newEmailMasked: maskEmail(result.email),
      });
    } catch {
      securityNoticeSent = false;
      logger.warn(
        { code: "ACCOUNT_EMAIL_CHANGE_SECURITY_NOTICE_FAILED" },
        "Old-address security notice could not be delivered",
      );
    }
    return { kind: "updated", email: result.email, securityNoticeSent };
  };
}
