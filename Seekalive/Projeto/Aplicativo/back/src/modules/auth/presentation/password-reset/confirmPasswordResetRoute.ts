import argon2 from "argon2";
import { and, desc, eq, gt, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
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
import {
  passwordResetConfirmSchema,
  PASSWORD_POLICY_VERSION,
  SUPPORT_EMAIL,
} from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../../security/request-origin";
import {
  clearDeviceCookie,
  clearSessionCookie,
  constantTimeEquals,
  hashPasswordResetCode,
  requireCsrf,
} from "../../../../security/session";
import { hashPassword } from "../../application/passwordHashing";
import { sendError, sendValidationError, supportLockMessage } from "../responses";

const router: IRouter = Router();
const MAX_PASSWORD_RESET_ATTEMPTS = 5;
const invalidPasswordResetMessage = "Código inválido ou expirado. Solicite um novo código.";

router.post(
  "/password/reset/confirm",
  createAuthRateLimit("password-reset-confirm", 10, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
    const parsed = passwordResetConfirmSchema.safeParse(request.body);
    if (!parsed.success) {
      sendValidationError(response, parsed.error.issues);
      return;
    }

    const email = parsed.data.email;
    const now = new Date();
    const [account] = await db
      .select({
        id: accounts.id,
        status: accounts.status,
        securityLockedAt: accounts.securityLockedAt,
        verifiedAt: accountEmails.verifiedAt,
        passwordHash: passwordCredentials.passwordHash,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
      .where(eq(accountEmails.emailNormalized, email))
      .limit(1);

    if (!account || account.status !== "active" || !account.verifiedAt) {
      sendError(response, 400, "INVALID_PASSWORD_RESET", invalidPasswordResetMessage);
      return;
    }
    if (account.securityLockedAt) {
      sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), { supportEmail: SUPPORT_EMAIL });
      return;
    }

    const [challenge] = await db
      .select({
        id: authChallenges.id,
        tokenHash: authChallenges.tokenHash,
        attempts: authChallenges.attempts,
      })
      .from(authChallenges)
      .where(and(
        eq(authChallenges.accountId, account.id),
        eq(authChallenges.purpose, "reset_password"),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now),
        lt(authChallenges.attempts, MAX_PASSWORD_RESET_ATTEMPTS),
      ))
      .orderBy(desc(authChallenges.createdAt))
      .limit(1);

    if (!challenge) {
      sendError(response, 400, "INVALID_PASSWORD_RESET", invalidPasswordResetMessage);
      return;
    }

    const expectedHash = hashPasswordResetCode(account.id, parsed.data.code);
    if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
      await db
        .update(authChallenges)
        .set({ attempts: sql`${authChallenges.attempts} + 1` })
        .where(and(
          eq(authChallenges.id, challenge.id),
          isNull(authChallenges.consumedAt),
          gt(authChallenges.expiresAt, now),
          lt(authChallenges.attempts, MAX_PASSWORD_RESET_ATTEMPTS),
        ));
      sendError(response, 400, "INVALID_PASSWORD_RESET", invalidPasswordResetMessage);
      return;
    }

    if (await argon2.verify(account.passwordHash, parsed.data.newPassword).catch(() => false)) {
      sendError(response, 400, "PASSWORD_REUSE", "Escolha uma senha diferente da senha atual.");
      return;
    }

    const newPasswordHash = await hashPassword(parsed.data.newPassword);
    let passwordWasReset: boolean;
    try {
      passwordWasReset = await db.transaction(async (tx) => {
        const [currentAccount] = await tx
          .select({ id: accounts.id, securityLockedAt: accounts.securityLockedAt })
          .from(accounts)
          .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
          .where(and(
            eq(accounts.id, account.id),
            eq(accounts.status, "active"),
            isNull(accounts.securityLockedAt),
            isNotNull(accountEmails.verifiedAt),
          ))
          .for("update");
        if (!currentAccount) return false;

        const [consumedChallenge] = await tx
          .update(authChallenges)
          .set({ consumedAt: now })
          .where(and(
            eq(authChallenges.id, challenge.id),
            eq(authChallenges.accountId, account.id),
            eq(authChallenges.purpose, "reset_password"),
            eq(authChallenges.tokenHash, challenge.tokenHash),
            isNull(authChallenges.consumedAt),
            gt(authChallenges.expiresAt, now),
            lt(authChallenges.attempts, MAX_PASSWORD_RESET_ATTEMPTS),
          ))
          .returning({ id: authChallenges.id });
        if (!consumedChallenge) return false;

        const [updatedCredential] = await tx
          .update(passwordCredentials)
          .set({
            passwordHash: newPasswordHash,
            passwordPolicyVersion: PASSWORD_POLICY_VERSION,
            passwordChangedAt: now,
          })
          .where(and(
            eq(passwordCredentials.accountId, account.id),
            eq(passwordCredentials.passwordHash, account.passwordHash),
          ))
          .returning({ accountId: passwordCredentials.accountId });
        if (!updatedCredential) throw new Error("PASSWORD_RESET_CREDENTIAL_CHANGED");

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
            inArray(authChallenges.purpose, ["reset_password", "password_update", "device_login"]),
            isNull(authChallenges.consumedAt),
            sql`${authChallenges.id} <> ${challenge.id}`,
          ));
        return true;
      });
    } catch (error) {
      if (error instanceof Error && error.message === "PASSWORD_RESET_CREDENTIAL_CHANGED") {
        sendError(response, 409, "CREDENTIALS_CHANGED", "As credenciais foram alteradas. Solicite um novo código.");
        return;
      }
      throw error;
    }

    if (!passwordWasReset) {
      sendError(response, 400, "INVALID_PASSWORD_RESET", invalidPasswordResetMessage);
      return;
    }
    clearSessionCookie(response);
    clearDeviceCookie(response);
    response.json({ status: "password_reset" });
  },
);

export default router;
