import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
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
  PASSWORD_POLICY_VERSION,
  SUPPORT_EMAIL,
  verificationConfirmSchema,
  verificationRequestSchema,
} from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../security/request-origin";
import {
  constantTimeEquals,
  hashToken,
  hashVerificationCode,
  PRE_AUTH_COOKIE,
  requireCsrf,
  setDeviceCookie,
  setSessionCookie,
} from "../../../security/session";
import { deliverVerificationCode } from "../application/emailVerification";
import { createSessionMaterial } from "../application/sessionMaterial";
import { getAuthEmailDelivery } from "../infrastructure/emailDelivery";
import { authResult } from "./authResult";
import { sendError, sendValidationError } from "./responses";

const router: IRouter = Router();
const MAX_VERIFICATION_ATTEMPTS = 5;
const genericVerificationMessage = "Se houver uma conta pendente para esse e-mail, enviaremos um novo código.";

router.post("/verification", createAuthRateLimit("verify-resend", 3, 15 * 60 * 1000), requireCsrf, async (request, response) => {
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
});

router.post("/verification/confirm", createAuthRateLimit("verify-confirm", 10, 15 * 60 * 1000), requireCsrf, async (request, response) => {
  const parsed = verificationConfirmSchema.safeParse(request.body);
  if (!parsed.success) {
    sendValidationError(response, parsed.error.issues);
    return;
  }
  const email = parsed.data.email.toLowerCase();
  const [account] = await db
    .select({
      id: accounts.id,
      username: accounts.username,
      displayName: accounts.displayName,
      accountType: accounts.accountType,
      status: accounts.status,
      onboardingCompletedAt: accounts.onboardingCompletedAt,
      createdAt: accounts.createdAt,
      verifiedAt: accountEmails.verifiedAt,
      passwordPolicyVersion: passwordCredentials.passwordPolicyVersion,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
    .where(eq(accountEmails.emailNormalized, email))
    .limit(1);
  if (!account || account.status !== "pending_verification" || account.verifiedAt) {
    sendError(response, 400, "INVALID_VERIFICATION_CODE", "Código inválido ou expirado.");
    return;
  }

  const now = new Date();
  const [challenge] = await db
    .select({
      id: authChallenges.id,
      attempts: authChallenges.attempts,
      tokenHash: authChallenges.tokenHash,
    })
    .from(authChallenges)
    .where(and(
      eq(authChallenges.accountId, account.id),
      eq(authChallenges.purpose, "verify_email"),
      isNull(authChallenges.consumedAt),
      gt(authChallenges.expiresAt, now),
    ))
    .orderBy(desc(authChallenges.createdAt))
    .limit(1);
  if (!challenge || challenge.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    sendError(response, 400, "INVALID_VERIFICATION_CODE", "Código inválido ou expirado.");
    return;
  }
  const expectedHash = hashVerificationCode(account.id, parsed.data.code);
  if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
    const nextAttemptCount = sql`${authChallenges.attempts} + 1`;
    await db.update(authChallenges).set({ attempts: nextAttemptCount }).where(eq(authChallenges.id, challenge.id));
    sendError(response, 400, "INVALID_VERIFICATION_CODE", "Código inválido ou expirado.");
    return;
  }

  const material = createSessionMaterial();
  const deviceRawToken = randomBytes(32).toString("base64url");
  let result: { id: string; createdAt: Date; expiresAt: Date } | null;
  try {
    result = await db.transaction(async (tx) => {
      const [consumedChallenge] = await tx
        .update(authChallenges)
        .set({ consumedAt: now })
        .where(and(eq(authChallenges.id, challenge.id), isNull(authChallenges.consumedAt)))
        .returning({ id: authChallenges.id });
      if (!consumedChallenge) throw new Error("VERIFICATION_ALREADY_CONSUMED");

      const [verifiedEmail] = await tx
        .update(accountEmails)
        .set({ verifiedAt: now, updatedAt: now })
        .where(and(eq(accountEmails.accountId, account.id), isNull(accountEmails.verifiedAt)))
        .returning({ accountId: accountEmails.accountId });
      if (!verifiedEmail) throw new Error("VERIFICATION_ALREADY_CONSUMED");

      const [activatedAccount] = await tx
        .update(accounts)
        .set({ status: "active", updatedAt: now })
        .where(and(eq(accounts.id, account.id), eq(accounts.status, "pending_verification")))
        .returning({ id: accounts.id });
      if (!activatedAccount) throw new Error("VERIFICATION_ALREADY_CONSUMED");

      if (account.passwordPolicyVersion < PASSWORD_POLICY_VERSION) return null;

      const [device] = await tx
        .insert(trustedDevices)
        .values({
          accountId: account.id,
          tokenHash: hashToken(deviceRawToken),
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
      return session;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "VERIFICATION_ALREADY_CONSUMED") {
      sendError(response, 400, "INVALID_VERIFICATION_CODE", "Código inválido ou expirado.");
      return;
    }
    throw error;
  }

  if (!result) {
    response.clearCookie(PRE_AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    response.json({
      emailVerified: true,
      passwordUpdateRequired: true,
      message: "E-mail confirmado. Atualize sua senha para entrar.",
    });
    return;
  }

  setSessionCookie(response, material.rawToken);
  setDeviceCookie(response, deviceRawToken);
  response.clearCookie(PRE_AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  response.json(authResult(account, result, material.csrfToken));
});

export default router;
