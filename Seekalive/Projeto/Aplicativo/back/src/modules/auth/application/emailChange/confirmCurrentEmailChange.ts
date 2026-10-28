import { randomInt, randomUUID } from "node:crypto";
import {
  ACCOUNT_CHANGE_SEND_COOLDOWN_MS,
  ACCOUNT_CHANGE_TTL_MS,
  invalidChallengeMessage,
  MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS,
} from "../accountSecurity/policy";
import type { AccountSecurityOperations } from "../accountSecurity/ports";
import { maskEmail } from "../emailMasking";
import {
  constantTimeEquals,
  hashAccountEmailChangeCode,
} from "../../../../security/tokenHashing";
import { logger } from "../../../../common/logger";
import type { EmailChangeDelivery, EmailChangeRepository } from "./ports";

export type ConfirmCurrentEmailResult =
  | { kind: "account_unavailable" }
  | { kind: "email_unavailable" }
  | { kind: "invalid"; message: string }
  | {
      kind: "created";
      challengeId: string;
      emailMasked: string;
      expiresAt: Date;
      message: string;
    }
  | { kind: "delivery_failed" };

export function createConfirmCurrentEmailChange(
  repository: EmailChangeRepository,
  security: AccountSecurityOperations,
) {
  return async function confirmCurrentEmailChange(
    accountId: string,
    challengeId: string,
    submittedCode: string,
    delivery: EmailChangeDelivery,
  ): Promise<ConfirmCurrentEmailResult> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const nextChallengeId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ACCOUNT_CHANGE_TTL_MS);
    const result = await repository.withTransaction(async (tx) => {
      const owner = await tx.lockOwner(accountId);
      if (
        !owner ||
        owner.status !== "active" ||
        !owner.emailVerifiedAt ||
        owner.securityLockedAt
      ) {
        return { kind: "account_unavailable" as const };
      }

      const challenge = await tx.lockActiveChallenge({
        accountId,
        challengeId,
        purpose: "account_email_change_current",
        now,
        maxAttempts: MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS,
      });
      if (!challenge?.pendingEmail) return { kind: "invalid" as const };

      const expectedHash = hashAccountEmailChangeCode(
        accountId,
        challenge.id,
        "account_email_change_current",
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
        return { kind: "invalid" as const };
      }

      if (await tx.isEmailInUse(challenge.pendingEmail)) {
        await tx.consumeCurrentEmailChallenge(challenge.id, now);
        return { kind: "email_unavailable" as const };
      }

      await tx.consumeCurrentEmailChallenge(challenge.id, now);
      await tx.insertChallenge({
        id: nextChallengeId,
        accountId,
        purpose: "account_email_change_new",
        tokenHash: hashAccountEmailChangeCode(
          accountId,
          nextChallengeId,
          "account_email_change_new",
          code,
        ),
        pendingEmail: challenge.pendingEmail,
        attempts: 0,
        createdAt: now,
        expiresAt,
        resendAvailableAt: new Date(
          now.getTime() + ACCOUNT_CHANGE_SEND_COOLDOWN_MS,
        ),
      });
      return {
        kind: "created" as const,
        pendingEmail: challenge.pendingEmail,
        displayName: owner.displayName,
      };
    });

    if (result.kind !== "created") {
      return result.kind === "invalid"
        ? { kind: "invalid", message: invalidChallengeMessage }
        : result;
    }

    try {
      await delivery.sendAccountEmailChangeNewCode({
        email: result.pendingEmail,
        displayName: result.displayName,
        code,
      });
    } catch {
      logger.warn(
        { code: "ACCOUNT_EMAIL_CHANGE_NEW_CODE_FAILED" },
        "New-address confirmation code could not be delivered",
      );
      await security.invalidateChallenge(
        nextChallengeId,
        accountId,
        "account_email_change_new",
      );
      return { kind: "delivery_failed" };
    }

    const emailMasked = maskEmail(result.pendingEmail);
    return {
      kind: "created",
      challengeId: nextChallengeId,
      emailMasked,
      expiresAt,
      message: `Enviamos um código para ${emailMasked}.`,
    };
  };
}
