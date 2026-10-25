import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  accountEmails,
  accounts,
  authChallenges,
  db,
  passwordCredentials,
  sessions,
  trustedDevices,
} from "@workspace/db";
import { challengeConfirmSchema, PASSWORD_POLICY_VERSION, SUPPORT_EMAIL } from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../../security/request-origin";
import {
  clearDeviceCookie,
  clearSessionCookie,
  constantTimeEquals,
  DEVICE_COOKIE,
  hashDeviceLoginCode,
  hashToken,
  PRE_AUTH_COOKIE,
  requireCsrf,
  setDeviceCookie,
  setSessionCookie,
} from "../../../../security/session";
import {
  DEVICE_FINAL_RESEND_COOLDOWN_MS,
  DEVICE_RESEND_COOLDOWN_MS,
  MAX_DEVICE_LOGIN_ATTEMPTS,
} from "../../application/challenges/deviceLogin";
import { createSessionMaterial } from "../../application/sessionMaterial";
import { authResult } from "../authResult";
import { sendError, sendValidationError, supportLockMessage } from "../responses";

const router: IRouter = Router();

router.post(
  "/device-verification/confirm",
  createAuthRateLimit("device-login-confirm", 10, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const parsed = challengeConfirmSchema.safeParse(request.body);
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
    const material = createSessionMaterial();
    const result = await db.transaction(async (tx) => {
      const [account] = await tx
        .select({
          id: accounts.id,
          username: accounts.username,
          displayName: accounts.displayName,
          accountType: accounts.accountType,
          status: accounts.status,
          securityLockedAt: accounts.securityLockedAt,
          onboardingCompletedAt: accounts.onboardingCompletedAt,
          createdAt: accounts.createdAt,
          verifiedAt: accountEmails.verifiedAt,
          passwordPolicyVersion: passwordCredentials.passwordPolicyVersion,
        })
        .from(accounts)
        .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
        .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
        .where(eq(accounts.id, preview.accountId))
        .for("update")
        .limit(1);
      if (!account || account.status !== "active" || !account.verifiedAt) return { kind: "unavailable" as const };
      if (account.securityLockedAt) return { kind: "locked" as const };

      const [challenge] = await tx
        .select({
          id: authChallenges.id,
          tokenHash: authChallenges.tokenHash,
          deviceTokenHash: authChallenges.deviceTokenHash,
          attempts: authChallenges.attempts,
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

      const expectedHash = hashDeviceLoginCode(account.id, challenge.id, parsed.data.code);
      if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
        const attempts = challenge.attempts + 1;
        if (attempts >= MAX_DEVICE_LOGIN_ATTEMPTS) {
          await tx
            .update(authChallenges)
            .set({ attempts, consumedAt: now })
            .where(eq(authChallenges.id, challenge.id));
          await tx
            .update(accounts)
            .set({ securityLockedAt: now, updatedAt: now })
            .where(and(eq(accounts.id, account.id), isNull(accounts.securityLockedAt)));
          await tx
            .update(sessions)
            .set({ revokedAt: now })
            .where(and(eq(sessions.accountId, account.id), isNull(sessions.revokedAt)));
          await tx
            .update(trustedDevices)
            .set({ revokedAt: now })
            .where(and(eq(trustedDevices.accountId, account.id), isNull(trustedDevices.revokedAt)));
          await tx
            .update(authChallenges)
            .set({ consumedAt: now })
            .where(and(
              eq(authChallenges.accountId, account.id),
              eq(authChallenges.purpose, "device_login"),
              isNull(authChallenges.consumedAt),
            ));
          return { kind: "locked" as const };
        }

        const resendDelay = attempts >= 2 ? DEVICE_FINAL_RESEND_COOLDOWN_MS : DEVICE_RESEND_COOLDOWN_MS;
        const resendAvailableAt = new Date(now.getTime() + resendDelay);
        await tx
          .update(authChallenges)
          .set({ attempts, resendAvailableAt })
          .where(eq(authChallenges.id, challenge.id));
        return { kind: "wrong_code" as const, resendAvailableAt, attemptsRemaining: MAX_DEVICE_LOGIN_ATTEMPTS - attempts };
      }

      if (account.passwordPolicyVersion < PASSWORD_POLICY_VERSION) {
        return { kind: "password_update_required" as const };
      }

      const [consumedChallenge] = await tx
        .update(authChallenges)
        .set({ consumedAt: now })
        .where(and(eq(authChallenges.id, challenge.id), isNull(authChallenges.consumedAt)))
        .returning({ id: authChallenges.id });
      if (!consumedChallenge) return { kind: "invalid" as const };

      const [device] = await tx
        .insert(trustedDevices)
        .values({
          accountId: account.id,
          tokenHash: challenge.deviceTokenHash,
          createdAt: now,
          lastSeenAt: now,
        })
        .returning({ id: trustedDevices.id });
      if (!device) throw new Error("Trusted device insert returned no row.");

      const [session] = await tx
        .insert(sessions)
        .values({
          accountId: account.id,
          deviceId: device.id,
          tokenHash: material.tokenHash,
          csrfTokenHash: material.csrfTokenHash,
          passwordPolicyVersion: PASSWORD_POLICY_VERSION,
          createdAt: material.createdAt,
          expiresAt: material.expiresAt,
        })
        .returning({ id: sessions.id, createdAt: sessions.createdAt, expiresAt: sessions.expiresAt });
      if (!session) throw new Error("Session insert returned no row.");
      return { kind: "authenticated" as const, account, session };
    });

    if (result.kind === "locked") {
      clearSessionCookie(response);
      clearDeviceCookie(response);
      sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), { supportEmail: SUPPORT_EMAIL });
      return;
    }
    if (result.kind === "unavailable") {
      sendError(response, 403, "ACCOUNT_UNAVAILABLE", "Esta conta não pode acessar o aplicativo.");
      return;
    }
    if (result.kind === "password_update_required") {
      sendError(response, 403, "PASSWORD_UPDATE_REQUIRED", "Atualize sua senha para atender aos requisitos atuais.");
      return;
    }
    if (result.kind === "wrong_code") {
      sendError(response, 400, "INVALID_DEVICE_CODE", "O código está incorreto.", {
        resendAvailableAt: result.resendAvailableAt.toISOString(),
        attemptsRemaining: result.attemptsRemaining,
      });
      return;
    }
    if (result.kind === "invalid") {
      sendError(response, 400, "DEVICE_VERIFICATION_EXPIRED", "O código expirou ou não pertence a esta instalação. Entre novamente.");
      return;
    }

    setDeviceCookie(response, rawDeviceToken);
    setSessionCookie(response, material.rawToken);
    response.clearCookie(PRE_AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    response.json(authResult(result.account, result.session, material.csrfToken));
  },
);

export default router;
