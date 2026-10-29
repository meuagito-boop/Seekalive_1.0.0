import { Router, type IRouter } from "express";
import {
  ConfirmAccountDeletionBody,
  ConfirmAccountRestorationBody,
  loginRequestSchema,
  RequestAccountDeletionCodeBody,
} from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../security/rateLimit";
import { loadActiveSession } from "../../../security/activeSession";
import { requireCsrf } from "../../../security/csrf";
import {
  PRE_AUTH_COOKIE,
  SESSION_COOKIE,
} from "../../../security/sessionConfig";
import { maskEmail } from "../application/emailMasking";
import { accountDeletionOperations } from "../composition/accountDeletion";
import { loginOperations } from "../composition/login";
import { sendError, sendValidationError } from "./responses";

const router: IRouter = Router();

router.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});

router.use(async (_request, response, next) => {
  try {
    if (!(await accountDeletionOperations.isSchemaReady())) {
      sendError(
        response,
        503,
        "ACCOUNT_DELETION_SCHEMA_REQUIRED",
        "A exclusão de conta aguarda a atualização do banco de desenvolvimento.",
      );
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
});

router.post(
  "/code",
  createAuthRateLimit("account-deletion-code", 5, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const parsed = RequestAccountDeletionCodeBody.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const session = await loadActiveSession(request);
    if (!session) {
      sendError(
        response,
        401,
        "UNAUTHENTICATED",
        "Entre novamente para continuar.",
      );
      return;
    }

    const result = await accountDeletionOperations.requestCode(
      session.accountId,
    );
    if (result.kind === "account_unavailable") {
      sendError(
        response,
        403,
        "ACCOUNT_UNAVAILABLE",
        "Esta conta não pode solicitar a exclusão.",
      );
      return;
    }
    if (
      result.kind === "delivery_unavailable" ||
      result.kind === "delivery_failed"
    ) {
      sendError(
        response,
        503,
        "EMAIL_DELIVERY_UNAVAILABLE",
        "Não foi possível enviar o código. Tente novamente mais tarde.",
      );
      return;
    }

    response.status(202).json({
      status: "verification_code_sent",
      challengeId: result.challengeId,
      emailMasked: maskEmail(result.email),
      expiresAt: result.expiresAt.toISOString(),
    });
  },
);

router.post(
  "/confirm",
  createAuthRateLimit("account-deletion-confirm", 10, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const session = await loadActiveSession(request);
    if (!session) {
      sendError(
        response,
        401,
        "UNAUTHENTICATED",
        "Entre novamente para continuar.",
      );
      return;
    }

    const parsed = ConfirmAccountDeletionBody.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const result = await accountDeletionOperations.confirm({
      accountId: session.accountId,
      challengeId: parsed.data.challengeId,
      code: parsed.data.code,
    });

    if (result.kind === "invalid_code") {
      sendError(
        response,
        400,
        "INVALID_VERIFICATION_CODE",
        "O código é inválido ou expirou.",
      );
      return;
    }
    if (result.kind === "account_unavailable") {
      sendError(
        response,
        409,
        "ACCOUNT_UNAVAILABLE",
        "Esta conta não pode solicitar a exclusão.",
      );
      return;
    }
    if (result.kind !== "scheduled") {
      sendError(
        response,
        409,
        "ACCOUNT_UNAVAILABLE",
        "Esta conta não pode solicitar a exclusão.",
      );
      return;
    }

    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    response.clearCookie(PRE_AUTH_COOKIE, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    response.json({
      status: "deletion_scheduled",
      deletionScheduledFor: result.deletionScheduledFor.toISOString(),
    });
  },
);

router.post(
  "/restore/code",
  createAuthRateLimit("account-restoration-code", 5, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const parsed = loginRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const authentication = await loginOperations.authenticate(
      parsed.data.identifier,
      parsed.data.password,
      null,
    );
    if (authentication.kind !== "account_deletion_pending") {
      sendError(
        response,
        401,
        "INVALID_CREDENTIALS",
        "Não foi possível validar a conta.",
      );
      return;
    }

    const result = await accountDeletionOperations.requestRestorationCode(
      authentication.account.id,
    );
    if (result.kind === "account_unavailable") {
      sendError(
        response,
        409,
        "ACCOUNT_UNAVAILABLE",
        "O prazo para restaurar esta conta terminou.",
      );
      return;
    }
    if (
      result.kind === "delivery_unavailable" ||
      result.kind === "delivery_failed"
    ) {
      sendError(
        response,
        503,
        "EMAIL_DELIVERY_UNAVAILABLE",
        "Não foi possível enviar o código. Tente novamente mais tarde.",
      );
      return;
    }

    response.status(202).json({
      status: "verification_code_sent",
      challengeId: result.challengeId,
      emailMasked: maskEmail(result.email),
      expiresAt: result.expiresAt.toISOString(),
    });
  },
);

router.post(
  "/restore/confirm",
  createAuthRateLimit("account-restoration-confirm", 10, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const parsed = ConfirmAccountRestorationBody.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const authentication = await loginOperations.authenticate(
      parsed.data.identifier,
      parsed.data.password,
      null,
    );
    if (authentication.kind !== "account_deletion_pending") {
      sendError(
        response,
        401,
        "INVALID_CREDENTIALS",
        "Não foi possível validar a conta.",
      );
      return;
    }

    const result = await accountDeletionOperations.confirmRestoration({
      accountId: authentication.account.id,
      challengeId: parsed.data.challengeId,
      code: parsed.data.code,
    });
    if (result.kind === "invalid_code") {
      sendError(
        response,
        400,
        "INVALID_VERIFICATION_CODE",
        "O código é inválido ou expirou.",
      );
      return;
    }
    if (result.kind !== "restored") {
      sendError(
        response,
        409,
        "ACCOUNT_UNAVAILABLE",
        "O prazo para restaurar esta conta terminou.",
      );
      return;
    }

    response.json({ status: "account_restored" });
  },
);

export default router;
