import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { and, eq, isNull } from "drizzle-orm";
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
  loginRequestSchema,
  PASSWORD_POLICY_VERSION,
  passwordPolicySchema,
  SUPPORT_EMAIL,
} from "@workspace/api-zod";
import { logger } from "../../../common/logger";
import { createAuthRateLimit } from "../../../security/request-origin";
import {
  DEVICE_COOKIE,
  hashToken,
  PRE_AUTH_COOKIE,
  requireCsrf,
  setDeviceCookie,
  setSessionCookie,
} from "../../../security/session";
import { createDeviceLoginChallenge } from "../application/challenges/deviceLogin";
import { fallbackPasswordHashPromise } from "../application/passwordHashing";
import { createSessionMaterial } from "../application/sessionMaterial";
import { getAuthEmailDelivery } from "../infrastructure/emailDelivery";
import { authResult } from "./authResult";
import { sendError, sendValidationError, supportLockMessage } from "./responses";

const router: IRouter = Router();

router.post("/login", createAuthRateLimit("login", 10, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const parsed = loginRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }
  const identifier = parsed.data.identifier.trim().replace(/^@/, "").toLowerCase();
  const isEmail = identifier.includes("@");
  const condition = isEmail ? eq(accountEmails.emailNormalized, identifier) : eq(accounts.username, identifier);
  const [row] = await db
    .select({
      id: accounts.id,
      username: accounts.username,
      displayName: accounts.displayName,
      accountType: accounts.accountType,
      accountStatus: accounts.status,
      securityLockedAt: accounts.securityLockedAt,
      onboardingCompletedAt: accounts.onboardingCompletedAt,
      createdAt: accounts.createdAt,
      email: accountEmails.emailNormalized,
      emailVerifiedAt: accountEmails.verifiedAt,
      passwordHash: passwordCredentials.passwordHash,
      passwordPolicyVersion: passwordCredentials.passwordPolicyVersion,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
    .where(condition)
    .limit(1);

  const fallbackHash = await fallbackPasswordHashPromise;
  const passwordIsValid = await argon2.verify(row?.passwordHash ?? fallbackHash, parsed.data.password).catch(() => false);
  if (!row || !passwordIsValid) {
    sendError(response, 401, "INVALID_CREDENTIALS", "Usuário/e-mail ou senha inválidos.");
    return;
  }
  if (row.accountStatus === "pending_verification" || !row.emailVerifiedAt) {
    sendError(response, 403, "EMAIL_NOT_VERIFIED", "Confirme o e-mail antes de entrar. Nenhuma sessão foi criada.");
    return;
  }
  if (row.accountStatus !== "active") {
    sendError(response, 403, "ACCOUNT_UNAVAILABLE", "Esta conta não pode acessar o aplicativo.");
    return;
  }
  if (row.securityLockedAt) {
    sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), { supportEmail: SUPPORT_EMAIL });
    return;
  }
  const passwordMatchesCurrentPolicy = passwordPolicySchema.safeParse(parsed.data.password).success;
  const rawDeviceToken = request.cookies?.[DEVICE_COOKIE];
  const usableDeviceToken = typeof rawDeviceToken === "string" && /^[A-Za-z0-9_-]{43}$/.test(rawDeviceToken)
    ? rawDeviceToken
    : null;
  const candidateDeviceHash = usableDeviceToken ? hashToken(usableDeviceToken) : null;
  const loginResult = await db.transaction(async (tx) => {
    const [currentAccount] = await tx
      .select({
        status: accounts.status,
        verifiedAt: accountEmails.verifiedAt,
        securityLockedAt: accounts.securityLockedAt,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(eq(accounts.id, row.id))
      .for("update")
      .limit(1);
    if (!currentAccount || currentAccount.status !== "active") return { kind: "account_unavailable" as const };
    if (!currentAccount.verifiedAt) return { kind: "email_not_verified" as const };
    if (currentAccount.securityLockedAt) return { kind: "account_locked" as const };

    const [credential] = await tx
      .select({
        passwordHash: passwordCredentials.passwordHash,
        passwordPolicyVersion: passwordCredentials.passwordPolicyVersion,
      })
      .from(passwordCredentials)
      .where(eq(passwordCredentials.accountId, row.id))
      .for("update")
      .limit(1);
    if (!credential || credential.passwordHash !== row.passwordHash) return { kind: "credentials_changed" as const };
    if (credential.passwordPolicyVersion > PASSWORD_POLICY_VERSION) return { kind: "unsupported_policy" as const };
    if (credential.passwordPolicyVersion < PASSWORD_POLICY_VERSION && !passwordMatchesCurrentPolicy) {
      return { kind: "password_update_required" as const };
    }
    if (credential.passwordPolicyVersion < PASSWORD_POLICY_VERSION) {
      await tx
        .update(passwordCredentials)
        .set({ passwordPolicyVersion: PASSWORD_POLICY_VERSION })
        .where(eq(passwordCredentials.accountId, row.id));
    }

    const [device] = candidateDeviceHash
      ? await tx
        .select({ id: trustedDevices.id })
        .from(trustedDevices)
        .where(and(
          eq(trustedDevices.accountId, row.id),
          eq(trustedDevices.tokenHash, candidateDeviceHash),
          isNull(trustedDevices.revokedAt),
        ))
        .for("update")
        .limit(1)
      : [];
    if (!device) return { kind: "unknown_device" as const };

    await tx
      .update(trustedDevices)
      .set({ lastSeenAt: new Date() })
      .where(eq(trustedDevices.id, device.id));
    const material = createSessionMaterial();
    const [session] = await tx
      .insert(sessions)
      .values({
        accountId: row.id,
        deviceId: device.id,
        tokenHash: material.tokenHash,
        csrfTokenHash: material.csrfTokenHash,
        passwordPolicyVersion: PASSWORD_POLICY_VERSION,
        createdAt: material.createdAt,
        expiresAt: material.expiresAt,
      })
      .returning({ id: sessions.id, createdAt: sessions.createdAt, expiresAt: sessions.expiresAt });
    if (!session) throw new Error("Session insert returned no row.");
    return { kind: "authenticated" as const, material, session };
  });
  if (loginResult.kind === "credentials_changed") {
    sendError(response, 409, "CREDENTIALS_CHANGED", "As credenciais foram alteradas. Entre novamente.");
    return;
  }
  if (loginResult.kind === "unsupported_policy") {
    sendError(response, 503, "PASSWORD_POLICY_UNSUPPORTED", "Atualize o aplicativo para continuar.");
    return;
  }
  if (loginResult.kind === "password_update_required") {
    sendError(response, 403, "PASSWORD_UPDATE_REQUIRED", "Atualize sua senha para atender aos requisitos atuais.");
    return;
  }
  if (loginResult.kind === "account_unavailable") {
    sendError(response, 403, "ACCOUNT_UNAVAILABLE", "Esta conta não pode acessar o aplicativo.");
    return;
  }
  if (loginResult.kind === "email_not_verified") {
    sendError(response, 403, "EMAIL_NOT_VERIFIED", "Confirme o e-mail antes de entrar. Nenhuma sessão foi criada.");
    return;
  }
  if (loginResult.kind === "account_locked") {
    sendError(response, 423, "SECURITY_LOCKED", supportLockMessage(), { supportEmail: SUPPORT_EMAIL });
    return;
  }
  if (loginResult.kind === "unknown_device") {
    const delivery = getAuthEmailDelivery();
    if (!delivery.isConfigured) {
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código para reconhecer esta instalação.");
      return;
    }
    const rawDeviceToken = randomBytes(32).toString("base64url");
    const pendingDeviceHash = hashToken(rawDeviceToken);
    const challenge = await createDeviceLoginChallenge(row.id, pendingDeviceHash);
    if (!challenge) {
      sendError(response, 403, "ACCOUNT_UNAVAILABLE", "Esta conta não pode acessar o aplicativo.");
      return;
    }
    try {
      await delivery.sendDeviceLoginCode({
        email: challenge.email,
        displayName: challenge.displayName,
        code: challenge.code,
      });
    } catch {
      logger.warn({ code: "DEVICE_LOGIN_EMAIL_FAILED" }, "Device verification email could not be delivered");
      await db
        .update(authChallenges)
        .set({ consumedAt: new Date() })
        .where(and(eq(authChallenges.id, challenge.challengeId), isNull(authChallenges.consumedAt)));
      sendError(response, 503, "EMAIL_DELIVERY_UNAVAILABLE", "Não foi possível enviar o código para reconhecer esta instalação. Tente novamente.");
      return;
    }

    setDeviceCookie(response, rawDeviceToken);
    response.status(202).json({
      status: "device_verification_required",
      challengeId: challenge.challengeId,
      emailMasked: challenge.emailMasked,
      expiresAt: challenge.expiresAt.toISOString(),
      resendAvailableAt: challenge.resendAvailableAt.toISOString(),
      message: "Como esta instalação ainda não foi reconhecida, enviamos um código para confirmar que é você.",
    });
    return;
  }

  setSessionCookie(response, loginResult.material.rawToken);
  if (!usableDeviceToken) throw new Error("Authenticated login has no valid trusted device token.");
  setDeviceCookie(response, usableDeviceToken);
  response.clearCookie(PRE_AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  response.json(authResult(row, loginResult.session, loginResult.material.csrfToken));
});

export default router;
