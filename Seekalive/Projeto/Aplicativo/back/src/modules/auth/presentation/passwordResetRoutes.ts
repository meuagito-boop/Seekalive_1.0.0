import { Router, type IRouter } from "express";
import {
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  SUPPORT_EMAIL,
} from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import {
  clearDeviceCookie,
  clearSessionCookie,
} from "../../../security/sessionCookies";
import { passwordResetOperations } from "../composition/passwordReset";
import {
  sendError,
  sendValidationError,
  supportLockMessage,
} from "./responses";

const router: IRouter = Router();
const genericPasswordResetMessage =
  "Se houver uma conta ativa e verificada para esse e-mail, enviaremos um código para redefinir a senha.";
const invalidPasswordResetMessage =
  "Código inválido ou expirado. Solicite um novo código.";

router.post(
  "/password/reset/request",
  createAuthRateLimit("password-reset-request", 5, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const startedAt = Date.now();
    const parsed = passwordResetRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const email = parsed.data.email;

    if (passwordResetOperations.isDeliveryConfigured()) {
      await passwordResetOperations.request(email);
    }

    const responseDelay = Math.max(0, 200 - (Date.now() - startedAt));
    if (responseDelay > 0)
      await new Promise((resolve) => setTimeout(resolve, responseDelay));
    response.status(202).json({
      status: "reset_requested",
      message: genericPasswordResetMessage,
    });
  },
);

router.post(
  "/password/reset/confirm",
  createAuthRateLimit("password-reset-confirm", 10, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const parsed = passwordResetConfirmSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const result = await passwordResetOperations.confirm(
      parsed.data.email,
      parsed.data.code,
      parsed.data.newPassword,
    );
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
    if (result.kind === "credentials_changed") {
      sendError(
        response,
        409,
        "CREDENTIALS_CHANGED",
        "As credenciais foram alteradas. Solicite um novo código.",
      );
      return;
    }
    if (result.kind === "invalid") {
      sendError(
        response,
        400,
        "INVALID_PASSWORD_RESET",
        invalidPasswordResetMessage,
      );
      return;
    }
    clearSessionCookie(response);
    clearDeviceCookie(response);
    response.json({ status: "password_reset" });
  },
);

export default router;
