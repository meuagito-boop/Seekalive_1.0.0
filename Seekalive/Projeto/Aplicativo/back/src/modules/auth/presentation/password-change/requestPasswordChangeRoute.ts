import { randomInt, randomUUID } from "node:crypto";
import argon2 from "argon2";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { accountPasswordChangeRequestSchema } from "@workspace/api-zod";
import { accountEmails, accounts, authChallenges, db, passwordCredentials } from "@workspace/db";
import { logger } from "../../../../common/logger";
import { createAuthRateLimit } from "../../../../security/request-origin";
import { hashAccountPasswordChangeCode, requireCsrf } from "../../../../security/session";
import { maskEmail } from "../../application/emailMasking";
import { hashPassword } from "../../application/passwordHashing";
import { getAuthEmailDelivery } from "../../infrastructure/emailDelivery";
import {
  ACCOUNT_CHANGE_SEND_COOLDOWN_MS,
  ACCOUNT_CHANGE_SEND_WINDOW_MS,
  ACCOUNT_CHANGE_TTL_MS,
  authenticatedAccountId,
  cooldownSeconds,
  invalidateChallenge,
  MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR,
  sendThrottleError,
  verifyCurrentPassword,
} from "../accountSecuritySupport";
import { sendError, sendValidationError } from "../responses";

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

export default router;
