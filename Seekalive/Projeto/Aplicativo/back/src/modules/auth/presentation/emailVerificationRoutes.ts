import { Router, type IRouter } from "express";
import {
  verificationConfirmSchema,
  verificationRequestSchema,
} from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../security/request-origin";
import {
  PRE_AUTH_COOKIE,
  requireCsrf,
  setDeviceCookie,
  setSessionCookie,
} from "../../../security/session";
import { confirmEmailVerification } from "../application/emailVerification/confirmEmailVerification";
import { requestEmailVerification } from "../application/emailVerification/requestEmailVerification";
import { getAuthEmailDelivery } from "../infrastructure/emailDelivery";
import { authResult } from "./authResult";
import { sendError, sendValidationError } from "./responses";

const router: IRouter = Router();
const genericVerificationMessage = "Se houver uma conta pendente para esse e-mail, enviaremos um novo código.";

router.post("/verification", createAuthRateLimit("verify-resend", 3, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const parsed = verificationRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }
  const delivery = getAuthEmailDelivery();
  if (!delivery.isConfigured) {
    sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "O envio de verificação por e-mail ainda não está configurado.");
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const result = await requestEmailVerification(email, delivery);
  if (result === "delivery_failed") {
    sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código. Tente novamente mais tarde.");
    return;
  }
  response.status(202).json({ status: "verification_required", message: genericVerificationMessage });
});

router.post("/verification/confirm", createAuthRateLimit("verify-confirm", 10, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const parsed = verificationConfirmSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }
  const email = parsed.data.email.toLowerCase();
  const result = await confirmEmailVerification(email, parsed.data.code);

  if (result.kind === "invalid") {
    sendError(response, 400, "INVALID_VERIFICATION_CODE", "Código inválido ou expirado.");
    return;
  }

  if (result.kind === "password_update_required") {
    response.clearCookie(PRE_AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    response.json({
      emailVerified: true,
      passwordUpdateRequired: true,
      message: "E-mail confirmado. Atualize sua senha para entrar.",
    });
    return;
  }

  setSessionCookie(response, result.material.rawToken);
  setDeviceCookie(response, result.deviceRawToken);
  response.clearCookie(PRE_AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  response.json(authResult(result.account, result.session, result.material.csrfToken));
});

export default router;
