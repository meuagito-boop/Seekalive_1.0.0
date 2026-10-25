import { and, eq, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { accountEmails, accounts, authChallenges, db } from "@workspace/db";
import { passwordResetRequestSchema } from "@workspace/api-zod";
import { logger } from "../../../../common/logger";
import { createAuthRateLimit } from "../../../../security/request-origin";
import { requireCsrf } from "../../../../security/session";
import { createPasswordResetChallenge } from "../../application/challenges/passwordReset";
import { getAuthEmailDelivery } from "../../infrastructure/emailDelivery";
import { sendError, sendValidationError } from "../responses";

const router: IRouter = Router();
const genericPasswordResetMessage =
  "Se houver uma conta ativa e verificada para esse e-mail, enviaremos um código para redefinir a senha.";

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
    const delivery = getAuthEmailDelivery();
    let pendingDelivery: { accountId: string; code: string; tokenHash: string } | null = null;

    if (delivery.isConfigured) {
      const [account] = await db
        .select({
          id: accounts.id,
          status: accounts.status,
          securityLockedAt: accounts.securityLockedAt,
          verifiedAt: accountEmails.verifiedAt,
        })
        .from(accounts)
        .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
        .where(eq(accountEmails.emailNormalized, email))
        .limit(1);

      if (account?.status === "active" && account.verifiedAt && !account.securityLockedAt) {
        const challenge = await createPasswordResetChallenge(account.id);
        if (challenge) pendingDelivery = { accountId: account.id, ...challenge };
      }
    }

    const responseDelay = Math.max(0, 200 - (Date.now() - startedAt));
    if (responseDelay > 0) await new Promise((resolve) => setTimeout(resolve, responseDelay));
    response.status(202).json({
      status: "reset_requested",
      message: genericPasswordResetMessage,
    });

    if (pendingDelivery) {
      void delivery.sendPasswordResetCode({ email, code: pendingDelivery.code }).catch(async () => {
        logger.warn({ code: "PASSWORD_RESET_EMAIL_FAILED" }, "Password reset email could not be delivered");
        try {
          await db
            .update(authChallenges)
            .set({ consumedAt: new Date() })
            .where(and(
              eq(authChallenges.accountId, pendingDelivery.accountId),
              eq(authChallenges.purpose, "reset_password"),
              eq(authChallenges.tokenHash, pendingDelivery.tokenHash),
              isNull(authChallenges.consumedAt),
            ));
        } catch {
          logger.error({ code: "PASSWORD_RESET_CHALLENGE_INVALIDATION_FAILED" }, "Failed email challenge could not be invalidated");
        }
      });
    }
  },
);

export default router;
