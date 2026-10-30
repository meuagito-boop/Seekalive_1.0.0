import { Router, type IRouter } from "express";
import { registerRequestSchema } from "@workspace/api-zod";
import { logger } from "../../../common/logger";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { requireCsrf } from "../../../security/csrf";
import { hashPassword } from "../application/passwordHashing";
import {
  createRegistrationAccountService,
  registrationAvailabilityOperations,
} from "../composition/registration";
import { emailVerificationOperations } from "../composition/emailVerification";
import { sendError, sendValidationError } from "./responses";

const router: IRouter = Router();
const CURRENT_TERMS_VERSION = "v1";
const genericRegistrationMessage =
  "Se os dados forem válidos, enviaremos um código de verificação para o e-mail informado.";

router.post(
  "/register",
  createAuthRateLimit("register", 5, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const parsed = registerRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }
    const registration = parsed.data;
    if (registration.acceptedTermsVersion !== CURRENT_TERMS_VERSION) {
      sendError(
        response,
        400,
        "TERMS_VERSION_INVALID",
        "Atualize a página para aceitar a versão atual dos termos.",
      );
      return;
    }
    if (!emailVerificationOperations.isDeliveryConfigured()) {
      sendError(
        response,
        503,
        "EMAIL_DELIVERY_UNAVAILABLE",
        "O envio de verificação por e-mail ainda não está configurado. Nenhuma conta foi criada.",
      );
      return;
    }

    const username = registration.username.toLowerCase();
    const email = registration.email.toLowerCase();
    if (
      await registrationAvailabilityOperations.isRegistrationUsernameUnavailable(
        username,
      )
    ) {
      sendError(
        response,
        409,
        "USERNAME_UNAVAILABLE",
        "Esse nome de usuário não está disponível.",
      );
      return;
    }

    const emailMatch =
      await registrationAvailabilityOperations.findRegistrationEmail(email);
    if (emailMatch) {
      if (emailMatch.status === "pending_verification") {
        try {
          await emailVerificationOperations.sendVerificationCode(
            emailMatch,
            email,
          );
        } catch {
          logger.warn(
            { code: "EMAIL_DELIVERY_FAILED" },
            "Verification email could not be delivered",
          );
          sendError(
            response,
            503,
            "EMAIL_DELIVERY_UNAVAILABLE",
            "Não foi possível enviar o código. Tente novamente mais tarde.",
          );
          return;
        }
      }
      response.status(202).json({
        status: "verification_required",
        message: genericRegistrationMessage,
      });
      return;
    }

    const passwordHash = await hashPassword(registration.password);

    try {
      const registrationResult = await createRegistrationAccountService(
        registration,
        {
          username,
          email,
          passwordHash,
          acceptedTermsVersion: CURRENT_TERMS_VERSION,
        },
      );

      if (registrationResult.kind === "age_ineligible") {
        const message =
          registrationResult.reason === "underage"
            ? "O cadastro está disponível para pessoas com 18 anos ou mais."
            : registrationResult.reason === "over_age_limit"
              ? "Informe uma data de nascimento válida."
              : "Informe uma data de nascimento válida.";
        sendValidationError(response, [{ path: ["dateOfBirth"], message }]);
        return;
      }

      if (registrationResult.kind === "username_unavailable") {
        sendError(
          response,
          409,
          "USERNAME_UNAVAILABLE",
          "Esse nome de usuário não está disponível.",
        );
        return;
      }

      const account = registrationResult.account;
      try {
        await emailVerificationOperations.sendVerificationCode(account, email);
      } catch {
        logger.warn(
          { code: "EMAIL_DELIVERY_FAILED" },
          "Verification email could not be delivered",
        );
        sendError(
          response,
          503,
          "EMAIL_DELIVERY_UNAVAILABLE",
          "A conta ficou pendente, mas o e-mail não pôde ser enviado. Tente reenviar mais tarde.",
        );
        return;
      }
      response.status(202).json({
        status: "verification_required",
        message: genericRegistrationMessage,
      });
    } catch (error) {
      const pgError = error as { code?: string; constraint?: string };
      if (
        pgError.code === "23505" &&
        pgError.constraint === "accounts_username_unique"
      ) {
        sendError(
          response,
          409,
          "USERNAME_UNAVAILABLE",
          "Esse nome de usuário não está disponível.",
        );
        return;
      }
      if (
        pgError.code === "23505" &&
        pgError.constraint === "account_emails_email_unique"
      ) {
        response.status(202).json({
          status: "verification_required",
          message: genericRegistrationMessage,
        });
        return;
      }
      throw error;
    }
  },
);

export default router;
