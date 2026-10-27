import { Router, type IRouter } from "express";
import {
  accountPasswordChangeRequestSchema,
  challengeConfirmSchema,
} from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../security/request-origin";
import {
  clearDeviceCookie,
  clearSessionCookie,
  requireCsrf,
} from "../../../security/session";
import { accountSecurityOperations } from "../composition/accountSecurity";
import { confirmPasswordChange } from "../application/passwordChange/confirmPasswordChange";
import { requestPasswordChange } from "../application/passwordChange/requestPasswordChange";
import { authenticatedAccountId, sendThrottleError } from "./accountSecurityHttp";
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

    const result = await requestPasswordChange(
      accountId,
      parsed.data.currentPassword,
      parsed.data.newPassword,
      accountSecurityOperations,
    );
    if (result.kind === "invalid_current_password") {
      sendError(response, 401, "INVALID_CURRENT_PASSWORD", "A senha atual está incorreta.");
      return;
    }
    if (result.kind === "account_unavailable") {
      sendError(response, 423, "ACCOUNT_UNAVAILABLE", "Esta conta não pode alterar seus dados de segurança.");
      return;
    }
    if (result.kind === "password_reuse") {
      sendError(response, 400, "PASSWORD_REUSE", "Escolha uma senha diferente da senha atual.");
      return;
    }
    if (result.kind === "delivery_unavailable") {
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "O envio de códigos por e-mail não está disponível.");
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
    if (result.kind === "delivery_failed") {
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código. Tente novamente mais tarde.");
      return;
    }

    response.status(202).json({
      status: "password_change_verification_required",
      challengeId: result.challengeId,
      emailMasked: result.emailMasked,
      expiresAt: result.expiresAt.toISOString(),
      message: result.message,
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

    const result = await confirmPasswordChange(accountId, parsed.data.challengeId, parsed.data.code);
    if (result.kind === "account_unavailable") {
      sendError(response, 423, "ACCOUNT_UNAVAILABLE", "Esta conta não pode alterar seus dados de segurança.");
      return;
    }
    if (result.kind === "credentials_changed") {
      sendError(response, 409, "CREDENTIALS_CHANGED", "As credenciais mudaram. Inicie novamente a alteração.");
      return;
    }
    if (result.kind === "invalid") {
      sendError(response, 400, "INVALID_PASSWORD_CHANGE", result.message);
      return;
    }

    clearSessionCookie(response);
    clearDeviceCookie(response);
    response.json({ status: "password_changed" });
  },
);

export default router;
