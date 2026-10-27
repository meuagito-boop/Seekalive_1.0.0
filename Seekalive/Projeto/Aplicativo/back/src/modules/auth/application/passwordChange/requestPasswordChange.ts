import { randomInt, randomUUID } from "node:crypto";
import argon2 from "argon2";
import {
  ACCOUNT_CHANGE_SEND_COOLDOWN_MS,
  ACCOUNT_CHANGE_SEND_WINDOW_MS,
  ACCOUNT_CHANGE_TTL_MS,
  cooldownSeconds,
  MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR,
} from "../accountSecurity/policy";
import { maskEmail } from "../emailMasking";
import { hashPassword } from "../passwordHashing";
import { hashAccountPasswordChangeCode } from "../../../../security/session";
import { logger } from "../../../../common/logger";
import type { PasswordChangeRequestDependencies } from "./requestPorts";

export type RequestPasswordChangeResult =
  | { kind: "invalid_current_password" }
  | { kind: "account_unavailable" }
  | { kind: "password_reuse" }
  | { kind: "delivery_unavailable" }
  | { kind: "credentials_changed" }
  | { kind: "rate_limited"; waitSeconds: number }
  | { kind: "delivery_failed" }
  | {
      kind: "created";
      challengeId: string;
      emailMasked: string;
      expiresAt: Date;
      message: string;
    };

export function createRequestPasswordChange(
  dependencies: PasswordChangeRequestDependencies,
) {
  return async function requestPasswordChange(
    accountId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<RequestPasswordChangeResult> {
    const current = await dependencies.security.verifyCurrentPassword(
      accountId,
      currentPassword,
    );
    if (current.kind === "invalid_credentials") {
      return { kind: "invalid_current_password" };
    }
    if (current.kind === "account_unavailable") {
      return { kind: "account_unavailable" };
    }
    if (
      await argon2.verify(current.passwordHash, newPassword).catch(() => false)
    ) {
      return { kind: "password_reuse" };
    }

    const delivery = dependencies.getEmailDelivery();
    if (!delivery.isConfigured) return { kind: "delivery_unavailable" };

    const pendingPasswordHash = await hashPassword(newPassword);
    const challengeId = randomUUID();
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ACCOUNT_CHANGE_TTL_MS);
    const result = await dependencies.repository.withTransaction(
      async (transaction) => {
        const owner = await transaction.lockOwner(accountId);
        if (
          !owner ||
          owner.status !== "active" ||
          !owner.emailVerifiedAt ||
          owner.securityLockedAt
        ) {
          return { kind: "account_unavailable" as const };
        }
        if (owner.passwordHash !== current.passwordHash) {
          return { kind: "credentials_changed" as const };
        }

        const recent = await transaction.findRecentChallenges({
          accountId,
          createdAfter: new Date(now.getTime() - ACCOUNT_CHANGE_SEND_WINDOW_MS),
          limit: MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR,
        });
        const waitSeconds = cooldownSeconds(recent, now);
        if (waitSeconds !== null) {
          return { kind: "rate_limited" as const, waitSeconds };
        }

        await transaction.consumeActiveChallenges(accountId, now);
        await transaction.createChallenge({
          challengeId,
          accountId,
          tokenHash: hashAccountPasswordChangeCode(
            accountId,
            challengeId,
            code,
          ),
          pendingPasswordHash,
          basePasswordHash: current.passwordHash,
          attempts: 0,
          createdAt: now,
          expiresAt,
          resendAvailableAt: new Date(
            now.getTime() + ACCOUNT_CHANGE_SEND_COOLDOWN_MS,
          ),
        });
        return {
          kind: "created" as const,
          email: owner.email,
          displayName: owner.displayName,
        };
      },
    );

    if (result.kind !== "created") return result;
    try {
      await delivery.sendAccountPasswordChangeCode({
        email: result.email,
        displayName: result.displayName,
        code,
      });
    } catch {
      logger.warn(
        { code: "ACCOUNT_PASSWORD_CHANGE_CODE_FAILED" },
        "Account password-change code could not be delivered",
      );
      await dependencies.security.invalidateChallenge(
        challengeId,
        accountId,
        "account_password_change",
      );
      return { kind: "delivery_failed" };
    }

    const emailMasked = maskEmail(result.email);
    return {
      kind: "created",
      challengeId,
      emailMasked,
      expiresAt,
      message: `Enviamos um código para ${emailMasked}.`,
    };
  };
}
