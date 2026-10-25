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
  SUPPORT_EMAIL,
} from "@workspace/api-zod";
import { createAuthRateLimit } from "../../../../security/request-origin";
import {
  clearDeviceCookie,
  clearSessionCookie,
  constantTimeEquals,
  hashPasswordUpdateCode,
  requireCsrf,
} from "../../../../security/session";
import { MAX_PASSWORD_UPDATE_ATTEMPTS } from "../../application/challenges/passwordUpdate";
import { sendError, sendValidationError, supportLockMessage } from "../responses";

const router: IRouter = Router();

router.post(
  "/password/update/confirm",
  createAuthRateLimit("password-update-confirm", 10, 15 * 60 * 1000),
  requireCsrf,
  async (request, response) => {
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
  },
);

export default router;
