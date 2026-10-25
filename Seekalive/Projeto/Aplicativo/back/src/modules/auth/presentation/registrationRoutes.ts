import { and, eq, gt } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  accountEmails,
  accountUsernameReservations,
  accounts,
  db,
} from "@workspace/db";
import {
  PASSWORD_POLICY_VERSION,
  registerRequestSchema,
} from "@workspace/api-zod";
import { logger } from "../../../common/logger";
import { createAuthRateLimit } from "../../../security/request-origin";
import { requireCsrf } from "../../../security/session";
import {
  deliverVerificationCode,
} from "../application/emailVerification";
import { hashPassword } from "../application/passwordHashing";
import { createRegistrationAccount } from "../application/registration/createRegistrationAccount";
import { getAuthEmailDelivery } from "../infrastructure/emailDelivery";
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
    const delivery = getAuthEmailDelivery();
    if (registration.acceptedTermsVersion !== CURRENT_TERMS_VERSION) {
      sendError(response, 400, "TERMS_VERSION_INVALID", "Atualize a página para aceitar a versão atual dos termos.");
      return;
    }
    if (!delivery.isConfigured) {
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "O envio de verificação por e-mail ainda não está configurado. Nenhuma conta foi criada.");
      return;
    }

    const username = registration.username.toLowerCase();
    const email = registration.email.toLowerCase();
    const [usernameMatch] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.username, username))
      .limit(1);
    const [usernameReservation] = await db
      .select({ username: accountUsernameReservations.username })
      .from(accountUsernameReservations)
      .where(and(
        eq(accountUsernameReservations.username, username),
        gt(accountUsernameReservations.reservedUntil, new Date()),
      ))
      .limit(1);
    if (usernameMatch || usernameReservation) {
      sendError(response, 409, "USERNAME_UNAVAILABLE", "Esse nome de usuário não está disponível.");
      return;
    }

    const [emailMatch] = await db
      .select({ id: accounts.id, displayName: accounts.displayName, status: accounts.status })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(eq(accountEmails.emailNormalized, email))
      .limit(1);
    if (emailMatch) {
      if (emailMatch.status === "pending_verification") {
        try {
          await deliverVerificationCode(delivery, emailMatch, email);
        } catch {
          logger.warn({ code: "EMAIL_DELIVERY_FAILED" }, "Verification email could not be delivered");
          sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código. Tente novamente mais tarde.");
          return;
        }
      }
      response.status(202).json({ status: "verification_required", message: genericRegistrationMessage });
      return;
    }

    const passwordHash = await hashPassword(registration.password);

    try {
      const account = await createRegistrationAccount(registration, {
        username,
        email,
        passwordHash,
        acceptedTermsVersion: CURRENT_TERMS_VERSION,
      });

      if (!account) {
        sendError(response, 409, "USERNAME_UNAVAILABLE", "Esse nome de usuário não está disponível.");
        return;
      }

      try {
        await deliverVerificationCode(delivery, account, email);
      } catch {
        logger.warn({ code: "EMAIL_DELIVERY_FAILED" }, "Verification email could not be delivered");
        sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "A conta ficou pendente, mas o e-mail não pôde ser enviado. Tente reenviar mais tarde.");
        return;
      }
      response.status(202).json({ status: "verification_required", message: genericRegistrationMessage });
    } catch (error) {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError.code === "23505" && pgError.constraint === "accounts_username_unique") {
        sendError(response, 409, "USERNAME_UNAVAILABLE", "Esse nome de usuário não está disponível.");
        return;
      }
      if (pgError.code === "23505" && pgError.constraint === "account_emails_email_unique") {
        response.status(202).json({ status: "verification_required", message: genericRegistrationMessage });
        return;
      }
      throw error;
    }
  },
);

export default router;
