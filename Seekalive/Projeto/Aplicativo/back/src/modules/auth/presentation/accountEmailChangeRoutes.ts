import { Router, type IRouter } from "express";
import {
  accountEmailChangeRequestSchema,
  challengeConfirmSchema,
} from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import { emailChangeOperations } from "../composition/emailChange";
import {
  authenticatedAccountId,
  sendThrottleError,
} from "./accountSecurityHttp";
import { sendError, sendValidationError } from "./responses";

const router: IRouter = Router();

router.post(
  "/email/change/request",
  createAuthRateLimit("account-email-change-request", 5, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const accountId = await authenticatedAccountId(request, response);
    if (!accountId) return;
    const parsed = accountEmailChangeRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const result = await emailChangeOperations.startEmailChange(
      accountId,
      parsed.data.currentPassword,
      parsed.data.newEmail,
    );
    if (result.kind === "invalid_current_password") {
      sendError(
        response,
        401,
        "INVALID_CURRENT_PASSWORD",
        "A senha atual está incorreta.",
      );
      return;
    }
    if (result.kind === "account_unavailable") {
      sendError(
        response,
        423,
        "ACCOUNT_UNAVAILABLE",
        "Esta conta não pode alterar seus dados de segurança.",
      );
      return;
    }
    if (result.kind === "email_unchanged") {
      sendError(
        response,
        400,
        "EMAIL_UNCHANGED",
        "Informe um endereço diferente do e-mail atual.",
      );
      return;
    }
    if (result.kind === "delivery_unavailable") {
      sendError(
        response,
        503,
        "EMAIL_DELIVERY_UNAVAILABLE",
        "O envio de códigos por e-mail não está disponível.",
      );
      return;
    }
    if (result.kind === "credentials_changed") {
      sendError(
        response,
        409,
        "CREDENTIALS_CHANGED",
        "A senha ou o e-mail mudou. Atualize a tela e tente novamente.",
      );
      return;
    }
    if (result.kind === "email_unavailable") {
      sendError(
        response,
        409,
        "EMAIL_UNAVAILABLE",
        "Esse endereço não está disponível para esta conta.",
      );
      return;
    }
    if (result.kind === "rate_limited") {
      sendThrottleError(response, result.waitSeconds);
      return;
    }
    if (result.kind === "delivery_failed") {
      sendError(
        response,
        503,
        "EMAIL_DELIVERY_UNAVAILABLE",
        "Não foi possível enviar o código. Tente novamente mais tarde.",
      );
      return;
    }

    response.status(202).json({
      status: "current_email_verification_required",
      challengeId: result.challengeId,
      currentEmailMasked: result.currentEmailMasked,
      newEmailMasked: result.newEmailMasked,
      expiresAt: result.expiresAt.toISOString(),
      message: result.message,
    });
  },
);

router.post(
  "/email/change/confirm-current",
  createAuthRateLimit(
    "account-email-change-current-confirm",
    10,
    15 * 60 * 1000,
  ),
  requireCsrf,
  async (request, response) => {
    const accountId = await authenticatedAccountId(request, response);
    if (!accountId) return;
    const parsed = challengeConfirmSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const result = await emailChangeOperations.confirmCurrentEmailChange(
      accountId,
      parsed.data.challengeId,
      parsed.data.code,
    );
    if (result.kind === "account_unavailable") {
      sendError(
        response,
        423,
        "ACCOUNT_UNAVAILABLE",
        "Esta conta não pode alterar seus dados de segurança.",
      );
      return;
    }
    if (result.kind === "email_unavailable") {
      sendError(
        response,
        409,
        "EMAIL_UNAVAILABLE",
        "Esse endereço deixou de estar disponível. Inicie a troca novamente.",
      );
      return;
    }
    if (result.kind === "invalid") {
      sendError(response, 400, "INVALID_EMAIL_CHANGE", result.message);
      return;
    }
    if (result.kind === "delivery_failed") {
      sendError(
        response,
        503,
        "EMAIL_DELIVERY_UNAVAILABLE",
        "Não foi possível enviar o código ao novo endereço. Inicie a troca novamente.",
      );
      return;
    }

    response.status(202).json({
      status: "new_email_verification_required",
      challengeId: result.challengeId,
      newEmailMasked: result.emailMasked,
      expiresAt: result.expiresAt.toISOString(),
      message: result.message,
    });
  },
);

router.post(
  "/email/change/confirm-new",
  createAuthRateLimit("account-email-change-new-confirm", 10, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const accountId = await authenticatedAccountId(request, response);
    if (!accountId) return;
    const parsed = challengeConfirmSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const result = await emailChangeOperations.confirmNewEmailChange(
      accountId,
      parsed.data.challengeId,
      parsed.data.code,
    );
    if (result.kind === "account_unavailable") {
      sendError(
        response,
        423,
        "ACCOUNT_UNAVAILABLE",
        "Esta conta não pode alterar seus dados de segurança.",
      );
      return;
    }
    if (result.kind === "email_unavailable") {
      sendError(
        response,
        409,
        "EMAIL_UNAVAILABLE",
        "Esse endereço deixou de estar disponível. Inicie a troca novamente.",
      );
      return;
    }
    if (result.kind === "email_unchanged") {
      sendError(
        response,
        409,
        "EMAIL_UNCHANGED",
        "O e-mail atual não foi alterado.",
      );
      return;
    }
    if (result.kind === "invalid") {
      sendError(
        response,
        400,
        "INVALID_EMAIL_CHANGE",
        "Código inválido ou expirado. Inicie a alteração novamente.",
      );
      return;
    }

    response.json({
      status: "email_changed",
      email: result.email,
      securityNoticeSent: result.securityNoticeSent,
    });
  },
);

export default router;
