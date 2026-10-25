import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull, lt } from "drizzle-orm";
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
  verificationConfirmSchema,
} from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../../security/request-origin";
import {
  constantTimeEquals,
  hashToken,
  hashVerificationCode,
  PRE_AUTH_COOKIE,
  requireCsrf,
  setDeviceCookie,
  setSessionCookie,
} from "../../../../security/session";
import { createSessionMaterial } from "../../application/sessionMaterial";
import { authResult } from "../authResult";
import { sendError, sendValidationError } from "../responses";

const router: IRouter = Router();
const MAX_VERIFICATION_ATTEMPTS = 5;

router.post(
  "/verification/confirm",
  createAuthRateLimit("verify-confirm", 10, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
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
    const material = createSessionMaterial();
    const deviceRawToken = randomBytes(32).toString("base64url");
    let result:
      | { kind: "invalid" }
      | { kind: "password_update_required" }
      | { kind: "authenticated"; session: { id: string; createdAt: Date; expiresAt: Date } };
    try {
      result = await db.transaction(async (tx) => {
        const [challenge] = await tx
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
            lt(authChallenges.attempts, MAX_VERIFICATION_ATTEMPTS),
          ))
          .orderBy(desc(authChallenges.createdAt))
          .for("update")
          .limit(1);
        if (!challenge) return { kind: "invalid" as const };

        const expectedHash = hashVerificationCode(account.id, parsed.data.code);
        if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
          await tx
            .update(authChallenges)
            .set({ attempts: challenge.attempts + 1 })
            .where(and(
              eq(authChallenges.id, challenge.id),
              isNull(authChallenges.consumedAt),
              gt(authChallenges.expiresAt, now),
              lt(authChallenges.attempts, MAX_VERIFICATION_ATTEMPTS),
            ));
          return { kind: "invalid" as const };
        }

        const [consumedChallenge] = await tx
          .update(authChallenges)
          .set({ consumedAt: now })
          .where(and(
            eq(authChallenges.id, challenge.id),
            isNull(authChallenges.consumedAt),
            gt(authChallenges.expiresAt, now),
            lt(authChallenges.attempts, MAX_VERIFICATION_ATTEMPTS),
          ))
          .returning({ id: authChallenges.id });
        if (!consumedChallenge) return { kind: "invalid" as const };

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

        if (account.passwordPolicyVersion < PASSWORD_POLICY_VERSION) {
          return { kind: "password_update_required" as const };
        }

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
        return { kind: "authenticated" as const, session };
      });
    } catch (error) {
      if (error instanceof Error && error.message === "VERIFICATION_ALREADY_CONSUMED") {
        sendError(response, 400, "INVALID_VERIFICATION_CODE", "Código inválido ou expirado.");
        return;
      }
      throw error;
    }

    if (result.kind === "invalid") {
      sendError(response, 400, "INVALID_VERIFICATION_CODE", "Código inválido ou expirado.");
      return;
    }

    if (result.kind === "password_update_required") {
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
    response.json(authResult(account, result.session, material.csrfToken));
  },
);

export default router;
