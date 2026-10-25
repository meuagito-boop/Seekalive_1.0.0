import argon2 from "argon2";
import { and, eq, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { accountEmails, accounts, authChallenges, db, passwordCredentials } from "@workspace/db";
import { passwordPolicyUpdateSchema, SUPPORT_EMAIL } from "@workspace/api-zod";
import { logger } from "../../../../common/logger";
import { createAuthRateLimit } from "../../../../security/request-origin";
import { requireCsrf } from "../../../../security/session";
import { createPasswordUpdateChallenge } from "../../application/challenges/passwordUpdate";
import { fallbackPasswordHashPromise, hashPassword } from "../../application/passwordHashing";
import { getAuthEmailDelivery } from "../../infrastructure/emailDelivery";
import { sendError, sendValidationError, supportLockMessage } from "../responses";

const router: IRouter = Router();

router.post(
  "/password/update",
  createAuthRateLimit("password-update", 5, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const parsed = passwordPolicyUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const identifier = parsed.data.identifier.trim().replace(/^@/, "").toLowerCase();
    const condition = identifier.includes("@")
      ? eq(accountEmails.emailNormalized, identifier)
      : eq(accounts.username, identifier);
    const [row] = await db
      .select({
        id: accounts.id,
        status: accounts.status,
        securityLockedAt: accounts.securityLockedAt,
        emailVerifiedAt: accountEmails.verifiedAt,
        email: accountEmails.emailNormalized,
        displayName: accounts.displayName,
        passwordHash: passwordCredentials.passwordHash,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
      .where(condition)
      .limit(1);

    const fallbackHash = await fallbackPasswordHashPromise;
    const currentPasswordIsValid = await argon2
      .verify(row?.passwordHash ?? fallbackHash, parsed.data.currentPassword)
      .catch(() => false);
    if (!row || !currentPasswordIsValid) {
      sendError(response, 401, "INVALID_CREDENTIALS", "Usuário/e-mail ou senha inválidos.");
      return;
    }
    if (row.status === "pending_verification" || !row.emailVerifiedAt) {
      sendError(response, 403, "EMAIL_NOT_VERIFIED", "Confirme o e-mail antes de atualizar a senha.");
      return;
    }
    if (row.status !== "active") {
      sendError(response, 403, "ACCOUNT_UNAVAILABLE", "Esta conta não pode acessar o aplicativo.");
      return;
    }
    if (row.securityLockedAt) {
      sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), { supportEmail: SUPPORT_EMAIL });
      return;
    }
    if (await argon2.verify(row.passwordHash, parsed.data.newPassword).catch(() => false)) {
      sendError(response, 400, "PASSWORD_REUSE", "Escolha uma senha diferente da senha atual.");
      return;
    }

    const newPasswordHash = await hashPassword(parsed.data.newPassword);
    const delivery = getAuthEmailDelivery();
    if (!delivery.isConfigured) {
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código para confirmar a alteração da senha.");
      return;
    }

    const challenge = await createPasswordUpdateChallenge(row.id, newPasswordHash, row.passwordHash);
    if (!challenge) {
      sendError(response, 409, "CREDENTIALS_CHANGED", "As credenciais mudaram. Confira sua senha atual e tente novamente.");
      return;
    }
    try {
      await delivery.sendPasswordUpdateCode({
        email: challenge.email,
        displayName: challenge.displayName,
        code: challenge.code,
      });
    } catch {
      logger.warn({ code: "PASSWORD_UPDATE_EMAIL_FAILED" }, "Password update confirmation email could not be delivered");
      await db
        .update(authChallenges)
        .set({ consumedAt: new Date() })
        .where(and(eq(authChallenges.id, challenge.challengeId), isNull(authChallenges.consumedAt)));
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código. Tente novamente mais tarde.");
      return;
    }

    response.status(202).json({
      status: "password_update_verification_required",
      challengeId: challenge.challengeId,
      emailMasked: challenge.emailMasked,
      expiresAt: challenge.expiresAt.toISOString(),
      message: `Enviamos um código para ${challenge.emailMasked}.`,
    });
  },
);

export default router;
