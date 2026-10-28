import { PASSWORD_POLICY_VERSION } from "@workspace/api-zod";
import {
  constantTimeEquals,
  hashDeviceLoginCode,
  hashToken,
} from "../../../../security/tokenHashing";
import {
  DEVICE_FINAL_RESEND_COOLDOWN_MS,
  DEVICE_RESEND_COOLDOWN_MS,
  MAX_DEVICE_LOGIN_ATTEMPTS,
} from "../challenges/deviceLogin";
import { createSessionMaterial } from "../sessionMaterial";
import type { DeviceVerificationRepository } from "./ports";

export type DeviceLoginConfirmationResult =
  | { kind: "unavailable" }
  | { kind: "locked" }
  | { kind: "invalid" }
  | { kind: "password_update_required" }
  | { kind: "wrong_code"; resendAvailableAt: Date; attemptsRemaining: number }
  | {
      kind: "authenticated";
      account: {
        id: string;
        username: string;
        displayName: string;
        accountType: string;
        status: string;
        securityLockedAt: Date | null;
        onboardingCompletedAt: Date | null;
        createdAt: Date;
        verifiedAt: Date | null;
        passwordPolicyVersion: number;
      };
      session: { id: string; createdAt: Date; expiresAt: Date };
      material: ReturnType<typeof createSessionMaterial>;
    };

export function createConfirmDeviceLogin(
  repository: DeviceVerificationRepository,
) {
  return async function confirmDeviceLogin(
    challengeId: string,
    code: string,
    rawDeviceToken: string,
  ): Promise<DeviceLoginConfirmationResult> {
    const accountId = await repository.findAccountIdForChallenge(challengeId);
    if (!accountId) return { kind: "invalid" };

    const now = new Date();
    const material = createSessionMaterial();
    return repository.withTransaction(async (tx) => {
      const account = await tx.lockConfirmationAccount(accountId);
      if (!account || account.status !== "active" || !account.verifiedAt) {
        return { kind: "unavailable" as const };
      }
      if (account.securityLockedAt) return { kind: "locked" as const };

      const challenge = await tx.lockConfirmationChallenge({
        challengeId,
        accountId: account.id,
        now,
        maxAttempts: MAX_DEVICE_LOGIN_ATTEMPTS,
      });
      if (
        !challenge ||
        !challenge.deviceTokenHash ||
        !constantTimeEquals(
          hashToken(rawDeviceToken),
          challenge.deviceTokenHash,
        )
      ) {
        return { kind: "invalid" as const };
      }

      const expectedHash = hashDeviceLoginCode(account.id, challenge.id, code);
      if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
        const attempts = challenge.attempts + 1;
        if (attempts >= MAX_DEVICE_LOGIN_ATTEMPTS) {
          await tx.lockAccountAndRevokeAccess({
            accountId: account.id,
            challengeId: challenge.id,
            attempts,
            now,
          });
          return { kind: "locked" as const };
        }

        const resendDelay =
          attempts >= 2
            ? DEVICE_FINAL_RESEND_COOLDOWN_MS
            : DEVICE_RESEND_COOLDOWN_MS;
        const resendAvailableAt = new Date(now.getTime() + resendDelay);
        await tx.recordWrongCode({
          challengeId: challenge.id,
          attempts,
          resendAvailableAt,
        });
        return {
          kind: "wrong_code" as const,
          resendAvailableAt,
          attemptsRemaining: MAX_DEVICE_LOGIN_ATTEMPTS - attempts,
        };
      }

      if (account.passwordPolicyVersion < PASSWORD_POLICY_VERSION) {
        return { kind: "password_update_required" as const };
      }

      const consumed = await tx.consumeChallenge({
        challengeId: challenge.id,
        now,
      });
      if (!consumed) return { kind: "invalid" as const };

      const deviceId = await tx.createTrustedDevice({
        accountId: account.id,
        tokenHash: challenge.deviceTokenHash,
        now,
      });
      if (!deviceId) throw new Error("Trusted device insert returned no row.");

      const session = await tx.createSession({
        accountId: account.id,
        deviceId,
        material,
        passwordPolicyVersion: PASSWORD_POLICY_VERSION,
      });
      if (!session) throw new Error("Session insert returned no row.");
      return { kind: "authenticated" as const, account, session, material };
    });
  };
}
