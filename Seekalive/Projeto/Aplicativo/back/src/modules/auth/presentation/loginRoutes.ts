import { Router, type IRouter } from "express";
import { loginRequestSchema, SUPPORT_EMAIL } from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../security/request-origin";
import {
  DEVICE_COOKIE,
  PRE_AUTH_COOKIE,
  requireCsrf,
  setDeviceCookie,
  setSessionCookie,
} from "../../../security/session";
import { authenticateLogin } from "../application/login/authenticateLogin";
import { startDeviceVerification } from "../application/login/startDeviceVerification";
import { challengeOperations } from "../composition/challenges";
import { authResult } from "./authResult";
import { sendError, sendValidationError, supportLockMessage } from "./responses";

const router: IRouter = Router();

router.post("/login", createAuthRateLimit("login", 10, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const parsed = loginRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }

  const result = await authenticateLogin(
    parsed.data.identifier,
    parsed.data.password,
    request.cookies?.[DEVICE_COOKIE],
  );
  if (result.kind === "invalid_credentials") {
    sendError(response, 401, "INVALID_CREDENTIALS", "Usuário/e-mail ou senha inválidos.");
    return;
  }
  if (result.kind === "email_not_verified") {
    sendError(response, 403, "EMAIL_NOT_VERIFIED", "Confirme o e-mail antes de entrar. Nenhuma sessão foi criada.");
    return;
  }
  if (result.kind === "account_unavailable") {
    sendError(response, 403, "ACCOUNT_UNAVAILABLE", "Esta conta não pode acessar o aplicativo.");
    return;
  }
  if (result.kind === "account_locked") {
    sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), { supportEmail: SUPPORT_EMAIL });
    return;
  }
  if (result.kind === "credentials_changed") {
    sendError(response, 409, "CREDENTIALS_CHANGED", "As credenciais foram alteradas. Entre novamente.");
    return;
  }
  if (result.kind === "unsupported_policy") {
    sendError(response, 503, "PASSWORD_POLICY_UNSUPPORTED", "Atualize o aplicativo para continuar.");
    return;
  }
  if (result.kind === "password_update_required") {
    sendError(response, 403, "PASSWORD_UPDATE_REQUIRED", "Atualize sua senha para atender aos requisitos atuais.");
    return;
  }
  if (result.kind === "unknown_device") {
    const verification = await startDeviceVerification(result.account.id, {
      createChallenge: challengeOperations.createDeviceLoginChallenge,
      invalidateChallenge: challengeOperations.invalidateDeviceLoginChallenge,
    });
    if (verification.kind === "delivery_unavailable") {
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código para reconhecer esta instalação.");
      return;
    }
    if (verification.kind === "account_unavailable") {
      sendError(response, 403, "ACCOUNT_UNAVAILABLE", "Esta conta não pode acessar o aplicativo.");
      return;
    }
    if (verification.kind === "delivery_failed") {
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código para reconhecer esta instalação. Tente novamente.");
      return;
    }

    setDeviceCookie(response, verification.rawDeviceToken);
    response.status(202).json({
      status: "device_verification_required",
      challengeId: verification.challenge.challengeId,
      emailMasked: verification.challenge.emailMasked,
      expiresAt: verification.challenge.expiresAt.toISOString(),
      resendAvailableAt: verification.challenge.resendAvailableAt.toISOString(),
      message: "Como esta instalação ainda não foi reconhecida, enviamos um código para confirmar que é você.",
    });
    return;
  }

  setSessionCookie(response, result.material.rawToken);
  if (!result.deviceToken) throw new Error("Authenticated login has no valid trusted device token.");
  setDeviceCookie(response, result.deviceToken);
  response.clearCookie(PRE_AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  response.json(authResult(result.account, result.session, result.material.csrfToken));
});

export default router;
