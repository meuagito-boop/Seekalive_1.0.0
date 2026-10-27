import { Router, type IRouter } from "express";
import {
  challengeConfirmSchema,
  passwordPolicyUpdateSchema,
  SUPPORT_EMAIL,
} from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../security/request-origin";
import {
  clearDeviceCookie,
  clearSessionCookie,
  requireCsrf,
} from "../../../security/session";
import { passwordUpdateOperations } from "../composition/passwordUpdate";
import { getAuthEmailDelivery } from "../infrastructure/emailDelivery";
import {
  sendError,
  sendValidationError,
  supportLockMessage,
} from "./responses";

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

    const result = await passwordUpdateOperations.request(
      parsed.data.identifier,
      parsed.data.currentPassword,
      parsed.data.newPassword,
      getAuthEmailDelivery(),
    );
    if (result.kind === "invalid_credentials") {
      sendError(
        response,
        401,
        "INVALID_CREDENTIALS",
        "Usuário/e-mail ou senha inválidos.",
      );
      return;
    }
    if (result.kind === "email_not_verified") {
      sendError(
        response,
        403,
        "EMAIL_NOT_VERIFIED",
        "Confirme o e-mail antes de atualizar a senha.",
      );
      return;
    }
    if (result.kind === "account_unavailable") {
      sendError(
        response,
        403,
        "ACCOUNT_UNAVAILABLE",
        "Esta conta não pode acessar o aplicativo.",
      );
      return;
    }
    if (result.kind === "locked") {
      sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), {
        supportEmail: SUPPORT_EMAIL,
      });
      return;
    }
    if (result.kind === "password_reuse") {
      sendError(
        response,
        400,
        "PASSWORD_REUSE",
        "Escolha uma senha diferente da senha atual.",
      );
      return;
    }
    if (result.kind === "delivery_unavailable") {
      sendError(
        response,
        503,
        "EMAIL_DELIVERY_UNAVAILABLE",
        "Não foi possível enviar o código para confirmar a alteração da senha.",
      );
      return;
    }
    if (result.kind === "credentials_changed") {
      sendError(
        response,
        409,
        "CREDENTIALS_CHANGED",
        "As credenciais mudaram. Confira sua senha atual e tente novamente.",
      );
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
      status: "password_update_verification_required",
      challengeId: result.challengeId,
      emailMasked: result.emailMasked,
      expiresAt: result.expiresAt.toISOString(),
      message: `Enviamos um código para ${result.emailMasked}.`,
    });
  },
);

router.post(
  "/password/update/confirm",
  createAuthRateLimit("password-update-confirm", 10, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const parsed = challengeConfirmSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const result = await passwordUpdateOperations.confirm(
      parsed.data.challengeId,
      parsed.data.code,
    );
    if (result.kind === "locked") {
      sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), {
        supportEmail: SUPPORT_EMAIL,
      });
      return;
    }
    if (result.kind === "credentials_changed") {
      sendError(
        response,
        409,
        "CREDENTIALS_CHANGED",
        "As credenciais mudaram. Inicie novamente a alteração da senha.",
      );
      return;
    }
    if (result.kind !== "updated") {
      sendError(
        response,
        400,
        "INVALID_PASSWORD_UPDATE",
        "Código inválido ou expirado. Inicie a alteração da senha novamente.",
      );
      return;
    }

    clearSessionCookie(response);
    clearDeviceCookie(response);
    response.json({ status: "password_updated" });
  },
);

export default router;
