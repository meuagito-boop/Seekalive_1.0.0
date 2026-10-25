import { and, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import {
  accountEmails,
  accounts,
  authChallenges,
  db,
  passwordCredentials,
  sessions,
  trustedDevices,
} from "@workspace/db";
import { PASSWORD_POLICY_VERSION } from "@workspace/api-zod";
import {
  invalidChallengeMessage,
  MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS,
} from "../accountSecurity/policy";
import { constantTimeEquals, hashAccountPasswordChangeCode } from "../../../../security/session";

export type ConfirmPasswordChangeResult =
  | { kind: "account_unavailable" }
  | { kind: "credentials_changed" }
  | { kind: "invalid"; message: string }
  | { kind: "updated" };

export async function confirmPasswordChange(
  accountId: string,
  challengeId: string,
  code: string,
): Promise<ConfirmPasswordChangeResult> {
  const now = new Date();
  const result = await db.transaction(async (tx) => {
    const [owner] = await tx
      .select({
        status: accounts.status,
        securityLockedAt: accounts.securityLockedAt,
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
        pendingPasswordHash: authChallenges.pendingPasswordHash,
        basePasswordHash: authChallenges.basePasswordHash,
        attempts: authChallenges.attempts,
      })
      .from(authChallenges)
      .where(and(
        eq(authChallenges.id, challengeId),
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, "account_password_change"),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now),
        lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
      ))
      .for("update")
      .limit(1);
    if (!challenge?.pendingPasswordHash || !challenge.basePasswordHash) {
      return { kind: "invalid" as const, message: invalidChallengeMessage };
    }

    const expectedHash = hashAccountPasswordChangeCode(accountId, challenge.id, code);
    if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
      await tx
        .update(authChallenges)
        .set({
          attempts: sql`${authChallenges.attempts} + 1`,
          pendingPasswordHash: challenge.attempts + 1 >= MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS
            ? null
            : challenge.pendingPasswordHash,
          basePasswordHash: challenge.attempts + 1 >= MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS
            ? null
            : challenge.basePasswordHash,
        })
        .where(and(
          eq(authChallenges.id, challenge.id),
          isNull(authChallenges.consumedAt),
          gt(authChallenges.expiresAt, now),
          lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
        ));
      return { kind: "invalid" as const, message: invalidChallengeMessage };
    }

    const [consumed] = await tx
      .update(authChallenges)
      .set({ consumedAt: now })
      .where(and(
        eq(authChallenges.id, challenge.id),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now),
        lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
      ))
      .returning({ id: authChallenges.id });
    if (!consumed) return { kind: "invalid" as const, message: invalidChallengeMessage };

    const [updatedCredential] = await tx
      .update(passwordCredentials)
      .set({
        passwordHash: challenge.pendingPasswordHash,
        passwordPolicyVersion: PASSWORD_POLICY_VERSION,
        passwordChangedAt: now,
      })
      .where(and(
        eq(passwordCredentials.accountId, accountId),
        eq(passwordCredentials.passwordHash, challenge.basePasswordHash),
      ))
      .returning({ accountId: passwordCredentials.accountId });
    if (!updatedCredential) return { kind: "credentials_changed" as const };

    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.accountId, accountId), isNull(sessions.revokedAt)));
    await tx
      .update(trustedDevices)
      .set({ revokedAt: now })
      .where(and(eq(trustedDevices.accountId, accountId), isNull(trustedDevices.revokedAt)));
    await tx
      .update(authChallenges)
      .set({
        consumedAt: sql`COALESCE(${authChallenges.consumedAt}, ${now})`,
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
      ));
    return { kind: "updated" as const };
  });
  return result;
}
