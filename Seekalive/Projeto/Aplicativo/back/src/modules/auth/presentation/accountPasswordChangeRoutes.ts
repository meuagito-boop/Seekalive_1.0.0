import { randomInt, randomUUID } from "node:crypto";
import argon2 from "argon2";
import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  sql,
} from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  accountPasswordChangeRequestSchema,
  challengeConfirmSchema,
  PASSWORD_POLICY_VERSION,
} from "@workspace/api-zod";
import {
  accountEmails,
  accounts,
  authChallenges,
  db,
  passwordCredentials,
  sessions,
  trustedDevices,
} from "@workspace/db";
import { logger } from "../../../common/logger";
import { createAuthRateLimit } from "../../../security/request-origin";
import {
  clearDeviceCookie,
  clearSessionCookie,
  constantTimeEquals,
  hashAccountPasswordChangeCode,
  requireCsrf,
} from "../../../security/session";
import { maskEmail } from "../application/emailMasking";
import { hashPassword } from "../application/passwordHashing";
import { getAuthEmailDelivery } from "../infrastructure/emailDelivery";
import {
  ACCOUNT_CHANGE_SEND_COOLDOWN_MS,
  ACCOUNT_CHANGE_SEND_WINDOW_MS,
  ACCOUNT_CHANGE_TTL_MS,
  authenticatedAccountId,
  cooldownSeconds,
  invalidChallengeMessage,
  invalidateChallenge,
  MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS,
  MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR,
  sendThrottleError,
  verifyCurrentPassword,
} from "./accountSecuritySupport";
import { sendError, sendValidationError } from "./responses";

const router: IRouter = Router();

router.post(
  "/password/change/request",
  createAuthRateLimit("account-password-change-request", 5, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const accountId = await authenticatedAccountId(request, response);
    if (!accountId) return;
    const parsed = accountPasswordChangeRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }
    const current = await verifyCurrentPassword(accountId, parsed.data.currentPassword);
    if (current.kind === "invalid_credentials") {
      sendError(response, 401, "INVALID_CURRENT_PASSWORD", "A senha atual está incorreta.");
      return;
    }
    if (current.kind === "account_unavailable") {
      sendError(response, 423, "ACCOUNT_UNAVAILABLE", "Esta conta não pode alterar seus dados de segurança.");
      return;
    }
    if (await argon2.verify(current.passwordHash, parsed.data.newPassword).catch(() => false)) {
      sendError(response, 400, "PASSWORD_REUSE", "Escolha uma senha diferente da senha atual.");
      return;
    }

    const delivery = getAuthEmailDelivery();
    if (!delivery.isConfigured) {
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "O envio de códigos por e-mail não está disponível.");
      return;
    }

    const pendingPasswordHash = await hashPassword(parsed.data.newPassword);
    const challengeId = randomUUID();
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ACCOUNT_CHANGE_TTL_MS);
    const result = await db.transaction(async (tx) => {
      const [owner] = await tx
        .select({
          status: accounts.status,
          securityLockedAt: accounts.securityLockedAt,
          email: accountEmails.emailNormalized,
          emailVerifiedAt: accountEmails.verifiedAt,
          displayName: accounts.displayName,
          passwordHash: passwordCredentials.passwordHash,
        })
        .from(accounts)
        .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
        .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
        .where(eq(accounts.id, accountId))
        .for("update")
        .limit(1);
      if (!owner || owner.status !== "active" || !owner.emailVerifiedAt || owner.securityLockedAt) {
        return { kind: "account_unavailable" as const };
      }
      if (owner.passwordHash !== current.passwordHash) {
        return { kind: "credentials_changed" as const };
      }

      const recent = await tx
        .select({
          createdAt: authChallenges.createdAt,
          resendAvailableAt: authChallenges.resendAvailableAt,
        })
        .from(authChallenges)
        .where(and(
          eq(authChallenges.accountId, accountId),
          eq(authChallenges.purpose, "account_password_change"),
          gt(authChallenges.createdAt, new Date(now.getTime() - ACCOUNT_CHANGE_SEND_WINDOW_MS)),
        ))
        .orderBy(desc(authChallenges.createdAt))
        .limit(MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR);
      const waitSeconds = cooldownSeconds(recent, now);
      if (waitSeconds !== null) return { kind: "rate_limited" as const, waitSeconds };

      await tx
        .update(authChallenges)
        .set({ consumedAt: now, pendingPasswordHash: null, basePasswordHash: null })
        .where(and(
          eq(authChallenges.accountId, accountId),
          eq(authChallenges.purpose, "account_password_change"),
          isNull(authChallenges.consumedAt),
        ));
      await tx.insert(authChallenges).values({
        id: challengeId,
        accountId,
        purpose: "account_password_change",
        tokenHash: hashAccountPasswordChangeCode(accountId, challengeId, code),
        pendingPasswordHash,
        basePasswordHash: current.passwordHash,
        attempts: 0,
        createdAt: now,
        expiresAt,
        resendAvailableAt: new Date(now.getTime() + ACCOUNT_CHANGE_SEND_COOLDOWN_MS),
      });
      return { kind: "created" as const, email: owner.email, displayName: owner.displayName };
    });

    if (result.kind === "account_unavailable") {
      sendError(response, 423, "ACCOUNT_UNAVAILABLE", "Esta conta não pode alterar seus dados de segurança.");
      return;
    }
    if (result.kind === "credentials_changed") {
      sendError(response, 409, "CREDENTIALS_CHANGED", "A senha mudou. Atualize a tela e tente novamente.");
      return;
    }
    if (result.kind === "rate_limited") {
      sendThrottleError(response, result.waitSeconds);
      return;
    }

    try {
      await delivery.sendAccountPasswordChangeCode({
        email: result.email,
        displayName: result.displayName,
        code,
      });
    } catch {
      logger.warn({ code: "ACCOUNT_PASSWORD_CHANGE_CODE_FAILED" }, "Account password-change code could not be delivered");
      await invalidateChallenge(challengeId, accountId, "account_password_change");
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código. Tente novamente mais tarde.");
      return;
    }
    response.status(202).json({
      status: "password_change_verification_required",
      challengeId,
      emailMasked: maskEmail(result.email),
      expiresAt: expiresAt.toISOString(),
      message: `Enviamos um código para ${maskEmail(result.email)}.`,
    });
  },
);

router.post(
  "/password/change/confirm",
  createAuthRateLimit("account-password-change-confirm", 10, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const accountId = await authenticatedAccountId(request, response);
    if (!accountId) return;
    const parsed = challengeConfirmSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const now = new Date();
    const result = await db.transaction(async (tx) => {
      const [owner] = await tx
        .select({
          status: accounts.status,
          securityLockedAt: accounts.securityLockedAt,
          emailVerifiedAt: accountEmails.verifiedAt,
        })
        .from(accounts)
        .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
        .where(eq(accounts.id, accountId))
        .for("update")
        .limit(1);
      if (!owner || owner.status !== "active" || !owner.emailVerifiedAt || owner.securityLockedAt) {
        return { kind: "account_unavailable" as const };
      }
      const [challenge] = await tx
        .select({
          id: authChallenges.id,
          tokenHash: authChallenges.tokenHash,
          pendingPasswordHash: authChallenges.pendingPasswordHash,
          basePasswordHash: authChallenges.basePasswordHash,
          attempts: authChallenges.attempts,
        })
        .from(authChallenges)
        .where(and(
          eq(authChallenges.id, parsed.data.challengeId),
          eq(authChallenges.accountId, accountId),
          eq(authChallenges.purpose, "account_password_change"),
          isNull(authChallenges.consumedAt),
          gt(authChallenges.expiresAt, now),
          lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
        ))
        .for("update")
        .limit(1);
      if (!challenge?.pendingPasswordHash || !challenge.basePasswordHash) {
        return { kind: "invalid" as const };
      }

      const expectedHash = hashAccountPasswordChangeCode(accountId, challenge.id, parsed.data.code);
      if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
        await tx
          .update(authChallenges)
          .set({
            attempts: sql`${authChallenges.attempts} + 1`,
            pendingPasswordHash: challenge.attempts + 1 >= MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS
              ? null
              : challenge.pendingPasswordHash,
            basePasswordHash: challenge.attempts + 1 >= MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS
              ? null
              : challenge.basePasswordHash,
          })
          .where(and(
            eq(authChallenges.id, challenge.id),
            isNull(authChallenges.consumedAt),
            gt(authChallenges.expiresAt, now),
            lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
          ));
        return { kind: "invalid" as const };
      }

      const [consumed] = await tx
        .update(authChallenges)
        .set({ consumedAt: now })
        .where(and(
          eq(authChallenges.id, challenge.id),
          isNull(authChallenges.consumedAt),
          gt(authChallenges.expiresAt, now),
          lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
        ))
        .returning({ id: authChallenges.id });
      if (!consumed) return { kind: "invalid" as const };

      const [updatedCredential] = await tx
        .update(passwordCredentials)
        .set({
          passwordHash: challenge.pendingPasswordHash,
          passwordPolicyVersion: PASSWORD_POLICY_VERSION,
          passwordChangedAt: now,
        })
        .where(and(
          eq(passwordCredentials.accountId, accountId),
          eq(passwordCredentials.passwordHash, challenge.basePasswordHash),
        ))
        .returning({ accountId: passwordCredentials.accountId });
      if (!updatedCredential) return { kind: "credentials_changed" as const };

      await tx
        .update(sessions)
        .set({ revokedAt: now })
        .where(and(eq(sessions.accountId, accountId), isNull(sessions.revokedAt)));
      await tx
        .update(trustedDevices)
        .set({ revokedAt: now })
        .where(and(eq(trustedDevices.accountId, accountId), isNull(trustedDevices.revokedAt)));
      await tx
        .update(authChallenges)
        .set({
          consumedAt: sql`COALESCE(${authChallenges.consumedAt}, ${now})`,
          pendingEmail: null,
          pendingPasswordHash: null,
          basePasswordHash: null,
        })
        .where(and(
          eq(authChallenges.accountId, accountId),
          inArray(authChallenges.purpose, [
            "account_email_change_current",
            "account_email_change_new",
            "account_password_change",
            "password_update",
            "reset_password",
            "device_login",
          ]),
        ));
      return { kind: "updated" as const };
    });

    if (result.kind === "account_unavailable") {
      sendError(response, 423, "ACCOUNT_UNAVAILABLE", "Esta conta não pode alterar seus dados de segurança.");
      return;
    }
    if (result.kind === "credentials_changed") {
      sendError(response, 409, "CREDENTIALS_CHANGED", "As credenciais mudaram. Inicie novamente a alteração.");
      return;
    }
    if (result.kind !== "updated") {
      sendError(response, 400, "INVALID_PASSWORD_CHANGE", invalidChallengeMessage);
      return;
    }

    clearSessionCookie(response);
    clearDeviceCookie(response);
    response.json({ status: "password_changed" });
  },
);

export default router;
