import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { accountEmails, accounts, db } from "@workspace/db";
import { verificationRequestSchema } from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../../security/request-origin";
import { requireCsrf } from "../../../../security/session";
import { deliverVerificationCode } from "../../application/emailVerification";
import { getAuthEmailDelivery } from "../../infrastructure/emailDelivery";
import { sendError, sendValidationError } from "../responses";

const router: IRouter = Router();
const genericVerificationMessage = "Se houver uma conta pendente para esse e-mail, enviaremos um novo código.";

router.post(
  "/verification",
  createAuthRateLimit("verify-resend", 3, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
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
    const [row] = await db
      .select({
        id: accounts.id,
        displayName: accounts.displayName,
        status: accounts.status,
        verifiedAt: accountEmails.verifiedAt,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(eq(accountEmails.emailNormalized, email))
      .limit(1);
    if (row?.status === "pending_verification" && !row.verifiedAt) {
      try {
        await deliverVerificationCode(delivery, row, email);
      } catch {
        sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código. Tente novamente mais tarde.");
        return;
      }
    }
    response.status(202).json({ status: "verification_required", message: genericVerificationMessage });
  },
);

export default router;
