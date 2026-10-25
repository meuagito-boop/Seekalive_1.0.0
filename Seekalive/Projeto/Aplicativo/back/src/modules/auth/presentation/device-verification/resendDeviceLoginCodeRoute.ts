import { randomInt } from "node:crypto";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { accountEmails, accounts, authChallenges, db } from "@workspace/db";
import { challengeResendSchema, SUPPORT_EMAIL } from "@workspace/api-zod";
import { logger } from "../../../../common/logger";
import { createAuthRateLimit } from "../../../../security/request-origin";
import {
  constantTimeEquals,
  DEVICE_COOKIE,
  hashDeviceLoginCode,
  hashToken,
  requireCsrf,
} from "../../../../security/session";
import {
  DEVICE_FINAL_RESEND_COOLDOWN_MS,
  DEVICE_LOGIN_TTL_MS,
  DEVICE_RESEND_COOLDOWN_MS,
  MAX_DEVICE_LOGIN_ATTEMPTS,
} from "../../application/challenges/deviceLogin";
import {
  EmailDeliveryUnavailableError,
  getAuthEmailDelivery,
} from "../../infrastructure/emailDelivery";
import { sendError, sendValidationError, supportLockMessage } from "../responses";

const router: IRouter = Router();

router.post(
  "/device-verification/resend",
  createAuthRateLimit("device-login-resend", 5, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const parsed = challengeResendSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }
    const rawDeviceToken = request.cookies?.[DEVICE_COOKIE];
    if (typeof rawDeviceToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(rawDeviceToken)) {
      sendError(response, 400, "DEVICE_VERIFICATION_EXPIRED", "A confirmação expirou. Entre novamente para receber um novo código.");
      return;
    }
    const [preview] = await db
      .select({ accountId: authChallenges.accountId })
      .from(authChallenges)
      .where(and(
        eq(authChallenges.id, parsed.data.challengeId),
        eq(authChallenges.purpose, "device_login"),
      ))
      .limit(1);
    if (!preview) {
      sendError(response, 400, "DEVICE_VERIFICATION_EXPIRED", "A confirmação expirou. Entre novamente para receber um novo código.");
      return;
    }

    const now = new Date();
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const update = await db.transaction(async (tx) => {
      const [account] = await tx
        .select({
          id: accounts.id,
          displayName: accounts.displayName,
          email: accountEmails.emailNormalized,
          status: accounts.status,
          verifiedAt: accountEmails.verifiedAt,
          securityLockedAt: accounts.securityLockedAt,
        })
        .from(accounts)
        .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
        .where(eq(accounts.id, preview.accountId))
        .for("update")
        .limit(1);
      if (!account || account.status !== "active" || !account.verifiedAt) return { kind: "unavailable" as const };
      if (account.securityLockedAt) return { kind: "locked" as const };

      const [challenge] = await tx
        .select({
          id: authChallenges.id,
          attempts: authChallenges.attempts,
          deviceTokenHash: authChallenges.deviceTokenHash,
          expiresAt: authChallenges.expiresAt,
          resendAvailableAt: authChallenges.resendAvailableAt,
        })
        .from(authChallenges)
        .where(and(
          eq(authChallenges.id, parsed.data.challengeId),
          eq(authChallenges.accountId, account.id),
          eq(authChallenges.purpose, "device_login"),
          isNull(authChallenges.consumedAt),
          gt(authChallenges.expiresAt, now),
          lt(authChallenges.attempts, MAX_DEVICE_LOGIN_ATTEMPTS),
        ))
        .for("update")
        .limit(1);
      if (
        !challenge
        || !challenge.deviceTokenHash
        || !constantTimeEquals(hashToken(rawDeviceToken), challenge.deviceTokenHash)
      ) return { kind: "invalid" as const };
      if (challenge.resendAvailableAt && challenge.resendAvailableAt > now) {
        return {
          kind: "cooldown" as const,
          retryAfterSeconds: Math.ceil((challenge.resendAvailableAt.getTime() - now.getTime()) / 1000),
        };
      }

      const resendDelay = challenge.attempts >= 2 ? DEVICE_FINAL_RESEND_COOLDOWN_MS : DEVICE_RESEND_COOLDOWN_MS;
      const resendAvailableAt = new Date(now.getTime() + resendDelay);
      const expiresAt = new Date(now.getTime() + DEVICE_LOGIN_TTL_MS);
      await tx
        .update(authChallenges)
        .set({
          tokenHash: hashDeviceLoginCode(account.id, challenge.id, code),
          expiresAt,
          resendAvailableAt,
        })
        .where(eq(authChallenges.id, challenge.id));
      return { kind: "sent" as const, email: account.email, displayName: account.displayName, expiresAt, resendAvailableAt };
    });

    if (update.kind === "locked") {
      sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), { supportEmail: SUPPORT_EMAIL });
      return;
    }
    if (update.kind === "unavailable" || update.kind === "invalid") {
      sendError(response, 400, "DEVICE_VERIFICATION_EXPIRED", "A confirmação expirou. Entre novamente para receber um novo código.");
      return;
    }
    if (update.kind === "cooldown") {
      sendError(response, 429, "CODE_RESEND_COOLDOWN", "Aguarde antes de pedir outro código.", {
        retryAfterSeconds: update.retryAfterSeconds,
      });
      return;
    }

    const delivery = getAuthEmailDelivery();
    try {
      if (!delivery.isConfigured) throw new EmailDeliveryUnavailableError();
      await delivery.sendDeviceLoginCode({ email: update.email, displayName: update.displayName, code });
    } catch {
      logger.warn({ code: "DEVICE_LOGIN_RESEND_FAILED" }, "Device verification email could not be delivered");
      await db
        .update(authChallenges)
        .set({ consumedAt: new Date() })
        .where(and(eq(authChallenges.id, parsed.data.challengeId), isNull(authChallenges.consumedAt)));
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o novo código. Entre novamente para tentar.");
      return;
    }

    response.json({
      status: "verification_code_resent",
      expiresAt: update.expiresAt.toISOString(),
      resendAvailableAt: update.resendAvailableAt.toISOString(),
    });
  },
);

export default router;
