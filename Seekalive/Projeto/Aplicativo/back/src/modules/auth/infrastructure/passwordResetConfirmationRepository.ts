import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
} from "drizzle-orm";
import {
  accountEmails,
  accounts,
  authChallenges,
  db,
  passwordCredentials,
  sessions,
  trustedDevices,
} from "@workspace/db";
import type { PasswordResetConfirmationRepository } from "../application/passwordReset/confirmationPorts";

export const passwordResetConfirmationRepository: PasswordResetConfirmationRepository =
  {
    async findAccountByEmail(email) {
      const [account] = await db
        .select({
          id: accounts.id,
          status: accounts.status,
          securityLockedAt: accounts.securityLockedAt,
          emailVerifiedAt: accountEmails.verifiedAt,
          passwordHash: passwordCredentials.passwordHash,
        })
        .from(accounts)
        .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
        .innerJoin(
          passwordCredentials,
          eq(passwordCredentials.accountId, accounts.id),
        )
        .where(eq(accountEmails.emailNormalized, email))
        .limit(1);

      return account ?? null;
    },

    async findActiveChallenge(input) {
      const [challenge] = await db
        .select({
          id: authChallenges.id,
          tokenHash: authChallenges.tokenHash,
        })
        .from(authChallenges)
        .where(
          and(
            eq(authChallenges.accountId, input.accountId),
            eq(authChallenges.purpose, "reset_password"),
            isNull(authChallenges.consumedAt),
            gt(authChallenges.expiresAt, input.now),
            lt(authChallenges.attempts, input.maxAttempts),
          ),
        )
        .orderBy(desc(authChallenges.createdAt))
        .limit(1);

      return challenge ?? null;
    },

    async recordInvalidAttempt(input) {
      await db
        .update(authChallenges)
        .set({ attempts: sql`${authChallenges.attempts} + 1` })
        .where(
          and(
            eq(authChallenges.id, input.challengeId),
            isNull(authChallenges.consumedAt),
            gt(authChallenges.expiresAt, input.now),
            lt(authChallenges.attempts, input.maxAttempts),
          ),
        );
    },

    async withTransaction(operation) {
      return db.transaction(async (tx) =>
        operation({
          async lockOwner(accountId) {
            const [account] = await tx
              .select({ id: accounts.id })
              .from(accounts)
              .innerJoin(
                accountEmails,
                eq(accountEmails.accountId, accounts.id),
              )
              .where(
                and(
                  eq(accounts.id, accountId),
                  eq(accounts.status, "active"),
                  isNull(accounts.securityLockedAt),
                  isNotNull(accountEmails.verifiedAt),
                ),
              )
              .for("update")
              .limit(1);

            return Boolean(account);
          },

          async consumeChallenge(input) {
            const [consumed] = await tx
              .update(authChallenges)
              .set({ consumedAt: input.now })
              .where(
                and(
                  eq(authChallenges.id, input.challengeId),
                  eq(authChallenges.accountId, input.accountId),
                  eq(authChallenges.purpose, "reset_password"),
                  eq(authChallenges.tokenHash, input.tokenHash),
                  isNull(authChallenges.consumedAt),
                  gt(authChallenges.expiresAt, input.now),
                  lt(authChallenges.attempts, input.maxAttempts),
                ),
              )
              .returning({ id: authChallenges.id });

            return Boolean(consumed);
          },

          async updatePasswordCredential(input) {
            const [updated] = await tx
              .update(passwordCredentials)
              .set({
                passwordHash: input.newPasswordHash,
                passwordPolicyVersion: input.passwordPolicyVersion,
                passwordChangedAt: input.now,
              })
              .where(
                and(
                  eq(passwordCredentials.accountId, input.accountId),
                  eq(
                    passwordCredentials.passwordHash,
                    input.currentPasswordHash,
                  ),
                ),
              )
              .returning({ accountId: passwordCredentials.accountId });

            return Boolean(updated);
          },

          async revokeSessions(accountId, now) {
            await tx
              .update(sessions)
              .set({ revokedAt: now })
              .where(
                and(
                  eq(sessions.accountId, accountId),
                  isNull(sessions.revokedAt),
                ),
              );
          },

          async revokeTrustedDevices(accountId, now) {
            await tx
              .update(trustedDevices)
              .set({ revokedAt: now })
              .where(
                and(
                  eq(trustedDevices.accountId, accountId),
                  isNull(trustedDevices.revokedAt),
                ),
              );
          },

          async consumeRelatedChallenges(accountId, now) {
            await tx
              .update(authChallenges)
              .set({ consumedAt: now })
              .where(
                and(
                  eq(authChallenges.accountId, accountId),
                  inArray(authChallenges.purpose, [
                    "reset_password",
                    "password_update",
                    "device_login",
                  ]),
                  isNull(authChallenges.consumedAt),
                ),
              );
          },
        }),
      );
    },
  };
