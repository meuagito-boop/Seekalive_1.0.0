import argon2 from "argon2";
import { and, desc, eq, gt, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
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
  constantTimeEquals,
  hashPasswordResetCode,
} from "../../../../security/session";
import { hashPassword } from "../passwordHashing";

const MAX_PASSWORD_RESET_ATTEMPTS = 5;

export type PasswordResetResult =
  | { kind: "invalid" }
  | { kind: "locked" }
  | { kind: "password_reuse" }
  | { kind: "credentials_changed" }
  | { kind: "updated" };

export async function confirmPasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<PasswordResetResult> {
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

  if (!account || account.status !== "active" || !account.verifiedAt) return { kind: "invalid" };
  if (account.securityLockedAt) return { kind: "locked" };

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
  if (!challenge) return { kind: "invalid" };

  const expectedHash = hashPasswordResetCode(account.id, code);
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
    return { kind: "invalid" };
  }

  if (await argon2.verify(account.passwordHash, newPassword).catch(() => false)) {
    return { kind: "password_reuse" };
  }
  const newPasswordHash = await hashPassword(newPassword);

  try {
    const passwordWasReset = await db.transaction(async (tx) => {
      const [currentAccount] = await tx
        .select({ id: accounts.id })
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
    return passwordWasReset ? { kind: "updated" } : { kind: "invalid" };
  } catch (error) {
    if (error instanceof Error && error.message === "PASSWORD_RESET_CREDENTIAL_CHANGED") {
      return { kind: "credentials_changed" };
    }
    throw error;
  }
}
