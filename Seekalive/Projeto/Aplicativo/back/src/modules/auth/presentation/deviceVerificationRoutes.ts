import { Router, type IRouter } from "express";
import {
  challengeConfirmSchema,
  challengeResendSchema,
  SUPPORT_EMAIL,
} from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../security/request-origin";
import {
  clearDeviceCookie,
  clearSessionCookie,
  DEVICE_COOKIE,
  PRE_AUTH_COOKIE,
  requireCsrf,
  setDeviceCookie,
  setSessionCookie,
} from "../../../security/session";
import { deviceVerificationOperations } from "../composition/deviceVerification";
import { authResult } from "./authResult";
import {
  sendError,
  sendValidationError,
  supportLockMessage,
} from "./responses";

const router: IRouter = Router();
const DEVICE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const EXPIRED_MESSAGE =
  "A confirmação expirou. Entre novamente para receber um novo código.";

router.post(
  "/device-verification/confirm",
  createAuthRateLimit("device-login-confirm", 10, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const parsed = challengeConfirmSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }
    const rawDeviceToken = request.cookies?.[DEVICE_COOKIE];
    if (
      typeof rawDeviceToken !== "string" ||
      !DEVICE_TOKEN_PATTERN.test(rawDeviceToken)
    ) {
      sendError(response, 400, "DEVICE_VERIFICATION_EXPIRED", EXPIRED_MESSAGE);
      return;
    }

    const result = await deviceVerificationOperations.confirmDeviceLogin(
      parsed.data.challengeId,
      parsed.data.code,
      rawDeviceToken,
    );
    if (result.kind === "locked") {
      clearSessionCookie(response);
      clearDeviceCookie(response);
      sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), {
        supportEmail: SUPPORT_EMAIL,
      });
      return;
    }
    if (result.kind === "unavailable") {
      sendError(
        response,
        403,
        "ACCOUNT_UNAVAILABLE",
        "Esta conta não pode acessar o aplicativo.",
      );
      return;
    }
    if (result.kind === "password_update_required") {
      sendError(
        response,
        403,
        "PASSWORD_UPDATE_REQUIRED",
        "Atualize sua senha para atender aos requisitos atuais.",
      );
      return;
    }
    if (result.kind === "wrong_code") {
      sendError(
        response,
        400,
        "INVALID_DEVICE_CODE",
        "O código está incorreto.",
        {
          resendAvailableAt: result.resendAvailableAt.toISOString(),
          attemptsRemaining: result.attemptsRemaining,
        },
      );
      return;
    }
    if (result.kind === "invalid") {
      sendError(
        response,
        400,
        "DEVICE_VERIFICATION_EXPIRED",
        "O código expirou ou não pertence a esta instalação. Entre novamente.",
      );
      return;
    }

    setDeviceCookie(response, rawDeviceToken);
    setSessionCookie(response, result.material.rawToken);
    response.clearCookie(PRE_AUTH_COOKIE, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    response.json(
      authResult(result.account, result.session, result.material.csrfToken),
    );
  },
);

router.post(
  "/device-verification/resend",
  createAuthRateLimit("device-login-resend", 5, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const parsed = challengeResendSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }
    const rawDeviceToken = request.cookies?.[DEVICE_COOKIE];
    if (
      typeof rawDeviceToken !== "string" ||
      !DEVICE_TOKEN_PATTERN.test(rawDeviceToken)
    ) {
      sendError(response, 400, "DEVICE_VERIFICATION_EXPIRED", EXPIRED_MESSAGE);
      return;
    }

    const result = await deviceVerificationOperations.resendDeviceLoginCode(
      parsed.data.challengeId,
      rawDeviceToken,
    );
    if (result.kind === "locked") {
      sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), {
        supportEmail: SUPPORT_EMAIL,
      });
      return;
    }
    if (result.kind === "unavailable" || result.kind === "invalid") {
      sendError(response, 400, "DEVICE_VERIFICATION_EXPIRED", EXPIRED_MESSAGE);
      return;
    }
    if (result.kind === "cooldown") {
      sendError(
        response,
        429,
        "CODE_RESEND_COOLDOWN",
        "Aguarde antes de pedir outro código.",
        {
          retryAfterSeconds: result.retryAfterSeconds,
        },
      );
      return;
    }
    if (
      result.kind === "delivery_failed" ||
      result.kind === "delivery_unavailable"
    ) {
      sendError(
        response,
        503,
        "EMAIL_DELIVERY_UNAVAILABLE",
        "Não foi possível enviar o novo código. Entre novamente para tentar.",
      );
      return;
    }

    response.json({
      status: "verification_code_resent",
      expiresAt: result.expiresAt.toISOString(),
      resendAvailableAt: result.resendAvailableAt.toISOString(),
    });
  },
);

export default router;
