import argon2 from "argon2";
import { and, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
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
  challengeConfirmSchema,
  PASSWORD_POLICY_VERSION,
  passwordPolicyUpdateSchema,
  SUPPORT_EMAIL,
} from "@workspace/api-zod";
import { logger } from "../../../common/logger";
import { createAuthRateLimit } from "../../../security/request-origin";
import {
  clearDeviceCookie,
  clearSessionCookie,
  constantTimeEquals,
  hashPasswordUpdateCode,
  requireCsrf,
} from "../../../security/session";
import {
  createPasswordUpdateChallenge,
  MAX_PASSWORD_UPDATE_ATTEMPTS,
} from "../application/challenges/passwordUpdate";
import { fallbackPasswordHashPromise, hashPassword } from "../application/passwordHashing";
import { getAuthEmailDelivery } from "../infrastructure/emailDelivery";
import { sendError, sendValidationError, supportLockMessage } from "./responses";

const router: IRouter = Router();

router.post("/password/update", createAuthRateLimit("password-update", 5, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const parsed = passwordPolicyUpdateSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }

  const identifier = parsed.data.identifier.trim().replace(/^@/, "").toLowerCase();
  const condition = identifier.includes("@")
    ? eq(accountEmails.emailNormalized, identifier)
    : eq(accounts.username, identifier);
  const [row] = await db
    .select({
      id: accounts.id,
      status: accounts.status,
      securityLockedAt: accounts.securityLockedAt,
      emailVerifiedAt: accountEmails.verifiedAt,
      email: accountEmails.emailNormalized,
      displayName: accounts.displayName,
      passwordHash: passwordCredentials.passwordHash,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
    .where(condition)
    .limit(1);

  const fallbackHash = await fallbackPasswordHashPromise;
  const currentPasswordIsValid = await argon2
    .verify(row?.passwordHash ?? fallbackHash, parsed.data.currentPassword)
    .catch(() => false);
  if (!row || !currentPasswordIsValid) {
    sendError(response, 401, "INVALID_CREDENTIALS", "Usuário/e-mail ou senha inválidos.");
    return;
  }
  if (row.status === "pending_verification" || !row.emailVerifiedAt) {
    sendError(response, 403, "EMAIL_NOT_VERIFIED", "Confirme o e-mail antes de atualizar a senha.");
    return;
  }
  if (row.status !== "active") {
    sendError(response, 403, "ACCOUNT_UNAVAILABLE", "Esta conta não pode acessar o aplicativo.");
    return;
  }
  if (row.securityLockedAt) {
    sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), { supportEmail: SUPPORT_EMAIL });
    return;
  }
  if (await argon2.verify(row.passwordHash, parsed.data.newPassword).catch(() => false)) {
    sendError(response, 400, "PASSWORD_REUSE", "Escolha uma senha diferente da senha atual.");
    return;
  }

  const newPasswordHash = await hashPassword(parsed.data.newPassword);
  const delivery = getAuthEmailDelivery();
  if (!delivery.isConfigured) {
    sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código para confirmar a alteração da senha.");
    return;
  }

  const challenge = await createPasswordUpdateChallenge(row.id, newPasswordHash, row.passwordHash);
  if (!challenge) {
    sendError(response, 409, "CREDENTIALS_CHANGED", "As credenciais mudaram. Confira sua senha atual e tente novamente.");
    return;
  }
  try {
    await delivery.sendPasswordUpdateCode({
      email: challenge.email,
      displayName: challenge.displayName,
      code: challenge.code,
    });
  } catch {
    logger.warn({ code: "PASSWORD_UPDATE_EMAIL_FAILED" }, "Password update confirmation email could not be delivered");
    await db
      .update(authChallenges)
      .set({ consumedAt: new Date() })
      .where(and(eq(authChallenges.id, challenge.challengeId), isNull(authChallenges.consumedAt)));
    sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código. Tente novamente mais tarde.");
    return;
  }

  response.status(202).json({
    status: "password_update_verification_required",
    challengeId: challenge.challengeId,
    emailMasked: challenge.emailMasked,
    expiresAt: challenge.expiresAt.toISOString(),
    message: `Enviamos um código para ${challenge.emailMasked}.`,
  });
});

router.post("/password/update/confirm", createAuthRateLimit("password-update-confirm", 10, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const parsed = challengeConfirmSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }

  const [preview] = await db
    .select({ accountId: authChallenges.accountId })
    .from(authChallenges)
    .where(and(
      eq(authChallenges.id, parsed.data.challengeId),
      eq(authChallenges.purpose, "password_update"),
    ))
    .limit(1);
  if (!preview) {
    sendError(response, 400, "INVALID_PASSWORD_UPDATE", "Código inválido ou expirado. Inicie a alteração da senha novamente.");
    return;
  }

  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const [account] = await tx
      .select({
        id: accounts.id,
        status: accounts.status,
        securityLockedAt: accounts.securityLockedAt,
        verifiedAt: accountEmails.verifiedAt,
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
        tokenHash: authChallenges.tokenHash,
        attempts: authChallenges.attempts,
        pendingPasswordHash: authChallenges.pendingPasswordHash,
        basePasswordHash: authChallenges.basePasswordHash,
      })
      .from(authChallenges)
      .where(and(
        eq(authChallenges.id, parsed.data.challengeId),
        eq(authChallenges.accountId, account.id),
        eq(authChallenges.purpose, "password_update"),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now),
        lt(authChallenges.attempts, MAX_PASSWORD_UPDATE_ATTEMPTS),
      ))
      .for("update")
      .limit(1);
    if (!challenge || !challenge.pendingPasswordHash || !challenge.basePasswordHash) {
      return { kind: "invalid" as const };
    }

    const expectedHash = hashPasswordUpdateCode(account.id, challenge.id, parsed.data.code);
    if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
      await tx
        .update(authChallenges)
        .set({ attempts: sql`${authChallenges.attempts} + 1` })
        .where(and(
          eq(authChallenges.id, challenge.id),
          isNull(authChallenges.consumedAt),
          lt(authChallenges.attempts, MAX_PASSWORD_UPDATE_ATTEMPTS),
        ));
      return { kind: "invalid" as const };
    }

    const [consumed] = await tx
      .update(authChallenges)
      .set({ consumedAt: now })
      .where(and(
        eq(authChallenges.id, challenge.id),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now),
        lt(authChallenges.attempts, MAX_PASSWORD_UPDATE_ATTEMPTS),
      ))
      .returning({ id: authChallenges.id });
    if (!consumed) return { kind: "invalid" as const };

    const [credential] = await tx
      .update(passwordCredentials)
      .set({
        passwordHash: challenge.pendingPasswordHash,
        passwordPolicyVersion: PASSWORD_POLICY_VERSION,
        passwordChangedAt: now,
      })
      .where(and(
        eq(passwordCredentials.accountId, account.id),
        eq(passwordCredentials.passwordHash, challenge.basePasswordHash),
      ))
      .returning({ accountId: passwordCredentials.accountId });
    if (!credential) return { kind: "credentials_changed" as const };

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
        inArray(authChallenges.purpose, ["device_login", "password_update", "reset_password"]),
        isNull(authChallenges.consumedAt),
      ));
    return { kind: "updated" as const };
  });

  if (result.kind === "locked") {
    sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), { supportEmail: SUPPORT_EMAIL });
    return;
  }
  if (result.kind === "credentials_changed") {
    sendError(response, 409, "CREDENTIALS_CHANGED", "As credenciais mudaram. Inicie novamente a alteração da senha.");
    return;
  }
  if (result.kind !== "updated") {
    sendError(response, 400, "INVALID_PASSWORD_UPDATE", "Código inválido ou expirado. Inicie a alteração da senha novamente.");
    return;
  }

  clearSessionCookie(response);
  clearDeviceCookie(response);
  response.json({ status: "password_updated" });
});

export default router;
