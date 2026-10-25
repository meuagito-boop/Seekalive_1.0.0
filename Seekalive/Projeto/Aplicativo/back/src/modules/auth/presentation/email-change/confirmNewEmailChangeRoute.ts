import { and, eq, gt, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { challengeConfirmSchema } from "@workspace/api-zod";
import { accountEmails, accounts, authChallenges, db } from "@workspace/db";
import { logger } from "../../../../common/logger";
import { createAuthRateLimit } from "../../../../security/request-origin";
import { constantTimeEquals, hashAccountEmailChangeCode, requireCsrf } from "../../../../security/session";
import { maskEmail } from "../../application/emailMasking";
import { getAuthEmailDelivery } from "../../infrastructure/emailDelivery";
import {
  authenticatedAccountId,
  invalidChallengeMessage,
  isUniqueConstraintError,
  MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS,
} from "../accountSecuritySupport";
import { sendError, sendValidationError } from "../responses";

const router: IRouter = Router();

router.post(
  "/email/change/confirm-new",
  createAuthRateLimit("account-email-change-new-confirm", 10, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const accountId = await authenticatedAccountId(request, response);
    if (!accountId) return;
    const parsed = challengeConfirmSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const now = new Date();
    let result:
      | { kind: "account_unavailable" }
      | { kind: "invalid" }
      | { kind: "email_unavailable" }
      | { kind: "email_unchanged" }
      | { kind: "updated"; oldEmail: string; email: string; displayName: string };
    try {
      result = await db.transaction(async (tx) => {
        const [owner] = await tx
          .select({
            status: accounts.status,
            securityLockedAt: accounts.securityLockedAt,
            displayName: accounts.displayName,
            currentEmail: accountEmails.emailNormalized,
            emailVerifiedAt: accountEmails.verifiedAt,
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
            eq(authChallenges.purpose, "account_email_change_new"),
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
          "account_email_change_new",
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

        if (challenge.pendingEmail === owner.currentEmail) {
          await tx
            .update(authChallenges)
            .set({ consumedAt: now, pendingEmail: null })
            .where(and(eq(authChallenges.id, challenge.id), isNull(authChallenges.consumedAt)));
          return { kind: "email_unchanged" as const };
        }
        const [usedAddress] = await tx
          .select({ accountId: accountEmails.accountId })
          .from(accountEmails)
          .where(eq(accountEmails.emailNormalized, challenge.pendingEmail))
          .limit(1);
        if (usedAddress) {
          await tx
            .update(authChallenges)
            .set({ consumedAt: now, pendingEmail: null })
            .where(and(eq(authChallenges.id, challenge.id), isNull(authChallenges.consumedAt)));
          return { kind: "email_unavailable" as const };
        }

        const [consumed] = await tx
          .update(authChallenges)
          .set({ consumedAt: now, pendingEmail: null })
          .where(and(
            eq(authChallenges.id, challenge.id),
            isNull(authChallenges.consumedAt),
            gt(authChallenges.expiresAt, now),
            lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
          ))
          .returning({ id: authChallenges.id });
        if (!consumed) return { kind: "invalid" as const };

        const [updatedEmail] = await tx
          .update(accountEmails)
          .set({
            emailNormalized: challenge.pendingEmail,
            verifiedAt: now,
            updatedAt: now,
          })
          .where(and(eq(accountEmails.accountId, accountId), isNotNull(accountEmails.verifiedAt)))
          .returning({ email: accountEmails.emailNormalized });
        if (!updatedEmail) return { kind: "account_unavailable" as const };

        await tx
          .update(accounts)
          .set({ updatedAt: now, version: sql`${accounts.version} + 1` })
          .where(and(eq(accounts.id, accountId), eq(accounts.status, "active")));
        await tx
          .update(authChallenges)
          .set({
            consumedAt: now,
            pendingEmail: null,
            pendingPasswordHash: null,
            basePasswordHash: null,
          })
          .where(and(
            eq(authChallenges.accountId, accountId),
            inArray(authChallenges.purpose, [
              "account_email_change_current",
              "account_email_change_new",
              "account_password_change",
              "password_update",
              "reset_password",
              "device_login",
            ]),
            isNull(authChallenges.consumedAt),
          ));
        return {
          kind: "updated" as const,
          oldEmail: owner.currentEmail,
          email: updatedEmail.email,
          displayName: owner.displayName,
        };
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        sendError(response, 409, "EMAIL_UNAVAILABLE", "Esse endereço deixou de estar disponível. Inicie a troca novamente.");
        return;
      }
      throw error;
    }

    if (result.kind === "account_unavailable") {
      sendError(response, 423, "ACCOUNT_UNAVAILABLE", "Esta conta não pode alterar seus dados de segurança.");
      return;
    }
    if (result.kind === "email_unavailable") {
      sendError(response, 409, "EMAIL_UNAVAILABLE", "Esse endereço deixou de estar disponível. Inicie a troca novamente.");
      return;
    }
    if (result.kind === "email_unchanged") {
      sendError(response, 409, "EMAIL_UNCHANGED", "O e-mail atual não foi alterado.");
      return;
    }
    if (result.kind !== "updated") {
      sendError(response, 400, "INVALID_EMAIL_CHANGE", invalidChallengeMessage);
      return;
    }

    let securityNoticeSent = true;
    try {
      await getAuthEmailDelivery().sendAccountEmailChangeSecurityNotice({
        email: result.oldEmail,
        displayName: result.displayName,
        newEmailMasked: maskEmail(result.email),
      });
    } catch {
      securityNoticeSent = false;
      logger.warn({ code: "ACCOUNT_EMAIL_CHANGE_SECURITY_NOTICE_FAILED" }, "Old-address security notice could not be delivered");
    }
    response.json({
      status: "email_changed",
      email: result.email,
      securityNoticeSent,
    });
  },
);

export default router;
