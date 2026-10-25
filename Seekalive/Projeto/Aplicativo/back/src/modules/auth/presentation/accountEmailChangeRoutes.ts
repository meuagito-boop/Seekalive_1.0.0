import { randomInt, randomUUID } from "node:crypto";
import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
} from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  accountEmailChangeRequestSchema,
  challengeConfirmSchema,
} from "@workspace/api-zod";
import {
  accountEmails,
  accounts,
  authChallenges,
  db,
  passwordCredentials,
} from "@workspace/db";
import { logger } from "../../../common/logger";
import { createAuthRateLimit } from "../../../security/request-origin";
import {
  constantTimeEquals,
  hashAccountEmailChangeCode,
  requireCsrf,
} from "../../../security/session";
import { maskEmail } from "../application/emailMasking";
import { getAuthEmailDelivery } from "../infrastructure/emailDelivery";
import {
  ACCOUNT_CHANGE_SEND_COOLDOWN_MS,
  ACCOUNT_CHANGE_SEND_WINDOW_MS,
  ACCOUNT_CHANGE_TTL_MS,
  authenticatedAccountId,
  cooldownSeconds,
  invalidChallengeMessage,
  invalidateChallenge,
  isUniqueConstraintError,
  MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS,
  MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR,
  sendThrottleError,
  verifyCurrentPassword,
} from "./accountSecuritySupport";
import { sendError, sendValidationError } from "./responses";

const router: IRouter = Router();

router.post(
  "/email/change/request",
  createAuthRateLimit("account-email-change-request", 5, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const accountId = await authenticatedAccountId(request, response);
    if (!accountId) return;
    const parsed = accountEmailChangeRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const { currentPassword, newEmail } = parsed.data;
    const current = await verifyCurrentPassword(accountId, currentPassword);
    if (current.kind === "invalid_credentials") {
      sendError(response, 401, "INVALID_CURRENT_PASSWORD", "A senha atual está incorreta.");
      return;
    }
    if (current.kind === "account_unavailable") {
      sendError(response, 423, "ACCOUNT_UNAVAILABLE", "Esta conta não pode alterar seus dados de segurança.");
      return;
    }
    if (newEmail === current.email) {
      sendError(response, 400, "EMAIL_UNCHANGED", "Informe um endereço diferente do e-mail atual.");
      return;
    }

    const delivery = getAuthEmailDelivery();
    if (!delivery.isConfigured) {
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "O envio de códigos por e-mail não está disponível.");
      return;
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const challengeId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ACCOUNT_CHANGE_TTL_MS);
    const result = await db.transaction(async (tx) => {
      const [owner] = await tx
        .select({
          id: accounts.id,
          status: accounts.status,
          securityLockedAt: accounts.securityLockedAt,
          email: accountEmails.emailNormalized,
          emailVerifiedAt: accountEmails.verifiedAt,
          displayName: accounts.displayName,
          passwordHash: passwordCredentials.passwordHash,
        })
        .from(accounts)
        .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
        .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
        .where(eq(accounts.id, accountId))
        .for("update")
        .limit(1);
      if (!owner || owner.status !== "active" || !owner.emailVerifiedAt || owner.securityLockedAt) {
        return { kind: "account_unavailable" as const };
      }
      if (owner.email !== current.email || owner.passwordHash !== current.passwordHash) {
        return { kind: "credentials_changed" as const };
      }
      const [usedAddress] = await tx
        .select({ accountId: accountEmails.accountId })
        .from(accountEmails)
        .where(eq(accountEmails.emailNormalized, newEmail))
        .limit(1);
      if (usedAddress) return { kind: "email_unavailable" as const };

      const recent = await tx
        .select({
          createdAt: authChallenges.createdAt,
          resendAvailableAt: authChallenges.resendAvailableAt,
        })
        .from(authChallenges)
        .where(and(
          eq(authChallenges.accountId, accountId),
          inArray(authChallenges.purpose, ["account_email_change_current", "account_email_change_new"]),
          gt(authChallenges.createdAt, new Date(now.getTime() - ACCOUNT_CHANGE_SEND_WINDOW_MS)),
        ))
        .orderBy(desc(authChallenges.createdAt))
        .limit(MAX_ACCOUNT_CHANGE_SENDS_PER_HOUR);
      const waitSeconds = cooldownSeconds(recent, now);
      if (waitSeconds !== null) return { kind: "rate_limited" as const, waitSeconds };

      await tx
        .update(authChallenges)
        .set({ consumedAt: now, pendingEmail: null })
        .where(and(
          eq(authChallenges.accountId, accountId),
          inArray(authChallenges.purpose, ["account_email_change_current", "account_email_change_new"]),
          isNull(authChallenges.consumedAt),
        ));
      await tx.insert(authChallenges).values({
        id: challengeId,
        accountId,
        purpose: "account_email_change_current",
        tokenHash: hashAccountEmailChangeCode(accountId, challengeId, "account_email_change_current", code),
        pendingEmail: newEmail,
        attempts: 0,
        createdAt: now,
        expiresAt,
        resendAvailableAt: new Date(now.getTime() + ACCOUNT_CHANGE_SEND_COOLDOWN_MS),
      });
      return { kind: "created" as const, currentEmail: owner.email, displayName: owner.displayName };
    });

    if (result.kind === "account_unavailable") {
      sendError(response, 423, "ACCOUNT_UNAVAILABLE", "Esta conta não pode alterar seus dados de segurança.");
      return;
    }
    if (result.kind === "credentials_changed") {
      sendError(response, 409, "CREDENTIALS_CHANGED", "A senha ou o e-mail mudou. Atualize a tela e tente novamente.");
      return;
    }
    if (result.kind === "email_unavailable") {
      sendError(response, 409, "EMAIL_UNAVAILABLE", "Esse endereço não está disponível para esta conta.");
      return;
    }
    if (result.kind === "rate_limited") {
      sendThrottleError(response, result.waitSeconds);
      return;
    }

    try {
      await delivery.sendAccountEmailChangeCurrentCode({
        email: result.currentEmail,
        displayName: result.displayName,
        code,
      });
    } catch {
      logger.warn({ code: "ACCOUNT_EMAIL_CHANGE_CURRENT_CODE_FAILED" }, "Account email-change code could not be delivered");
      await invalidateChallenge(challengeId, accountId, "account_email_change_current");
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código. Tente novamente mais tarde.");
      return;
    }

    response.status(202).json({
      status: "current_email_verification_required",
      challengeId,
      currentEmailMasked: maskEmail(result.currentEmail),
      newEmailMasked: maskEmail(newEmail),
      expiresAt: expiresAt.toISOString(),
      message: `Enviamos um código para ${maskEmail(result.currentEmail)}.`,
    });
  },
);

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

    const delivery = getAuthEmailDelivery();
    try {
      await delivery.sendAccountEmailChangeNewCode({
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
