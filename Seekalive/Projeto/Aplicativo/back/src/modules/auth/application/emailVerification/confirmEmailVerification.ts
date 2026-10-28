import { randomBytes } from "node:crypto";
import { PASSWORD_POLICY_VERSION } from "@workspace/api-zod";
import {
  constantTimeEquals,
  hashToken,
  hashVerificationCode,
} from "../../../../security/tokenHashing";
import { createSessionMaterial } from "../sessionMaterial";
import { VerificationAlreadyConsumedError } from "./errors";
import { MAX_EMAIL_VERIFICATION_ATTEMPTS } from "./policy";
import type { EmailVerificationRepository, VerificationAccount } from "./ports";

export type EmailVerificationResult =
  | { kind: "invalid" }
  | { kind: "password_update_required" }
  | {
      kind: "authenticated";
      account: VerificationAccount;
      session: {
        id: string;
        createdAt: Date;
        expiresAt: Date;
      };
      material: ReturnType<typeof createSessionMaterial>;
      deviceRawToken: string;
    };

export function createConfirmEmailVerification(
  repository: EmailVerificationRepository,
) {
  return async function confirmEmailVerification(
    email: string,
    code: string,
  ): Promise<EmailVerificationResult> {
    const account = await repository.findConfirmationAccountByEmail(email);
    if (
      !account ||
      account.status !== "pending_verification" ||
      account.verifiedAt
    ) {
      return { kind: "invalid" };
    }

    const now = new Date();
    const material = createSessionMaterial();
    const deviceRawToken = randomBytes(32).toString("base64url");

    try {
      const result = await repository.withTransaction(async (tx) => {
        const challenge = await tx.lockLatestChallenge({
          accountId: account.id,
          now,
          maxAttempts: MAX_EMAIL_VERIFICATION_ATTEMPTS,
        });
        if (!challenge) return { kind: "invalid" as const };

        const expectedHash = hashVerificationCode(account.id, code);
        if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
          await tx.recordInvalidAttempt({
            challengeId: challenge.id,
            attempts: challenge.attempts + 1,
            now,
            maxAttempts: MAX_EMAIL_VERIFICATION_ATTEMPTS,
          });
          return { kind: "invalid" as const };
        }

        const consumed = await tx.consumeChallenge({
          challengeId: challenge.id,
          now,
          maxAttempts: MAX_EMAIL_VERIFICATION_ATTEMPTS,
        });
        if (!consumed) return { kind: "invalid" as const };

        if (!(await tx.verifyEmail(account.id, now))) {
          throw new VerificationAlreadyConsumedError();
        }
        if (!(await tx.activateAccount(account.id, now))) {
          throw new VerificationAlreadyConsumedError();
        }

        if (account.passwordPolicyVersion < PASSWORD_POLICY_VERSION) {
          return { kind: "password_update_required" as const };
        }

        const deviceId = await tx.createTrustedDevice({
          accountId: account.id,
          tokenHash: hashToken(deviceRawToken),
          now,
        });
        if (!deviceId) {
          throw new Error("Trusted device insert returned no row.");
        }

        const session = await tx.createSession({
          accountId: account.id,
          deviceId,
          material,
          passwordPolicyVersion: PASSWORD_POLICY_VERSION,
        });
        if (!session) throw new Error("Session insert returned no row.");
        return { kind: "authenticated" as const, session };
      });

      if (result.kind !== "authenticated") return result;
      return {
        kind: "authenticated",
        account,
        session: result.session,
        material,
        deviceRawToken,
      };
    } catch (error) {
      if (error instanceof VerificationAlreadyConsumedError) {
        return { kind: "invalid" };
      }
      throw error;
    }
  };
}
