import { randomInt, randomUUID } from "node:crypto";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { challengeConfirmSchema } from "@workspace/api-zod";
import { accountEmails, accounts, authChallenges, db } from "@workspace/db";
import { logger } from "../../../../common/logger";
import { createAuthRateLimit } from "../../../../security/request-origin";
import { constantTimeEquals, hashAccountEmailChangeCode, requireCsrf } from "../../../../security/session";
import { maskEmail } from "../../application/emailMasking";
import { getAuthEmailDelivery } from "../../infrastructure/emailDelivery";
import {
  ACCOUNT_CHANGE_SEND_COOLDOWN_MS,
  ACCOUNT_CHANGE_TTL_MS,
  authenticatedAccountId,
  invalidChallengeMessage,
  invalidateChallenge,
  MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS,
} from "../accountSecuritySupport";
import { sendError, sendValidationError } from "../responses";

const router: IRouter = Router();

router.post(
  "/email/change/confirm-current",
  createAuthRateLimit("account-email-change-current-confirm", 10, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const accountId = await authenticatedAccountId(request, response);
    if (!accountId) return;
    const parsed = challengeConfirmSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const nextChallengeId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ACCOUNT_CHANGE_TTL_MS);
    const result = await db.transaction(async (tx) => {
      const [owner] = await tx
        .select({
          status: accounts.status,
          securityLockedAt: accounts.securityLockedAt,
          emailVerifiedAt: accountEmails.verifiedAt,
          displayName: accounts.displayName,
        })
        .from(accounts)
        .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
        .where(eq(accounts.id, accountId))
        .for("update")
        .limit(1);
      if (!owner || owner.status !== "active" || !owner.emailVerifiedAt || owner.securityLockedAt) {
        return { kind: "account_unavailable" as const };
      }
      const [challenge] = await tx
        .select({
          id: authChallenges.id,
          tokenHash: authChallenges.tokenHash,
          pendingEmail: authChallenges.pendingEmail,
          attempts: authChallenges.attempts,
        })
        .from(authChallenges)
        .where(and(
          eq(authChallenges.id, parsed.data.challengeId),
          eq(authChallenges.accountId, accountId),
          eq(authChallenges.purpose, "account_email_change_current"),
          isNull(authChallenges.consumedAt),
          gt(authChallenges.expiresAt, now),
          lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
        ))
        .for("update")
        .limit(1);
      if (!challenge?.pendingEmail) return { kind: "invalid" as const };

      const expectedHash = hashAccountEmailChangeCode(
        accountId,
        challenge.id,
        "account_email_change_current",
        parsed.data.code,
      );
      if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
        await tx
          .update(authChallenges)
          .set({
            attempts: sql`${authChallenges.attempts} + 1`,
            pendingEmail: challenge.attempts + 1 >= MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS ? null : challenge.pendingEmail,
          })
          .where(and(
            eq(authChallenges.id, challenge.id),
            isNull(authChallenges.consumedAt),
            gt(authChallenges.expiresAt, now),
            lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
          ));
        return { kind: "invalid" as const };
      }

      const [usedAddress] = await tx
        .select({ accountId: accountEmails.accountId })
        .from(accountEmails)
        .where(eq(accountEmails.emailNormalized, challenge.pendingEmail))
        .limit(1);
      await tx
        .update(authChallenges)
        .set({ consumedAt: now, pendingEmail: null })
        .where(and(eq(authChallenges.id, challenge.id), isNull(authChallenges.consumedAt)));
      if (usedAddress) return { kind: "email_unavailable" as const };

      await tx.insert(authChallenges).values({
        id: nextChallengeId,
        accountId,
        purpose: "account_email_change_new",
        tokenHash: hashAccountEmailChangeCode(accountId, nextChallengeId, "account_email_change_new", code),
        pendingEmail: challenge.pendingEmail,
        attempts: 0,
        createdAt: now,
        expiresAt,
        resendAvailableAt: new Date(now.getTime() + ACCOUNT_CHANGE_SEND_COOLDOWN_MS),
      });
      return { kind: "created" as const, pendingEmail: challenge.pendingEmail, displayName: owner.displayName };
    });

    if (result.kind === "account_unavailable") {
      sendError(response, 423, "ACCOUNT_UNAVAILABLE", "Esta conta não pode alterar seus dados de segurança.");
      return;
    }
    if (result.kind === "email_unavailable") {
      sendError(response, 409, "EMAIL_UNAVAILABLE", "Esse endereço deixou de estar disponível. Inicie a troca novamente.");
      return;
    }
    if (result.kind !== "created") {
      sendError(response, 400, "INVALID_EMAIL_CHANGE", invalidChallengeMessage);
      return;
    }

    try {
      await getAuthEmailDelivery().sendAccountEmailChangeNewCode({
        email: result.pendingEmail,
        displayName: result.displayName,
        code,
      });
    } catch {
      logger.warn({ code: "ACCOUNT_EMAIL_CHANGE_NEW_CODE_FAILED" }, "New-address confirmation code could not be delivered");
      await invalidateChallenge(nextChallengeId, accountId, "account_email_change_new");
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código ao novo endereço. Inicie a troca novamente.");
      return;
    }

    response.status(202).json({
      status: "new_email_verification_required",
      challengeId: nextChallengeId,
      newEmailMasked: maskEmail(result.pendingEmail),
      expiresAt: expiresAt.toISOString(),
      message: `Enviamos um código para ${maskEmail(result.pendingEmail)}.`,
    });
  },
);

export default router;
