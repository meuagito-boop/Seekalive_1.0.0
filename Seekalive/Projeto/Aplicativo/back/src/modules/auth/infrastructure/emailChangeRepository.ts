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
} from "@workspace/db";
import { EmailAddressConflictError } from "../application/emailChange/errors";
import type {
  EmailChangeRepository,
  EmailChangeTransaction,
} from "../application/emailChange/ports";

function isPostgresUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? error.code : undefined;
  const cause = "cause" in error ? error.cause : undefined;
  const causeCode =
    cause && typeof cause === "object" && "code" in cause
      ? cause.code
      : undefined;
  return code === "23505" || causeCode === "23505";
}

export const emailChangeRepository: EmailChangeRepository = {
  withTransaction<T>(
    operation: (tx: EmailChangeTransaction) => Promise<T>,
  ): Promise<T> {
    return db.transaction(async (tx) => {
      const transaction: EmailChangeTransaction = {
        async lockOwner(accountId) {
          const [owner] = await tx
            .select({
              id: accounts.id,
              status: accounts.status,
              securityLockedAt: accounts.securityLockedAt,
              email: accountEmails.emailNormalized,
              emailVerifiedAt: accountEmails.verifiedAt,
              displayName: accounts.displayName,
            })
            .from(accounts)
            .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
            .where(eq(accounts.id, accountId))
            .for("update")
            .limit(1);
          if (!owner) return null;

          const [credential] = await tx
            .select({ passwordHash: passwordCredentials.passwordHash })
            .from(passwordCredentials)
            .where(eq(passwordCredentials.accountId, accountId))
            .for("update")
            .limit(1);
          return { ...owner, passwordHash: credential?.passwordHash ?? null };
        },

        async isEmailInUse(email) {
          const [owner] = await tx
            .select({ accountId: accountEmails.accountId })
            .from(accountEmails)
            .where(eq(accountEmails.emailNormalized, email))
            .limit(1);
          return Boolean(owner);
        },

        async findRecentChallenges({ accountId, since, limit }) {
          return tx
            .select({
              createdAt: authChallenges.createdAt,
              resendAvailableAt: authChallenges.resendAvailableAt,
            })
            .from(authChallenges)
            .where(
              and(
                eq(authChallenges.accountId, accountId),
                inArray(authChallenges.purpose, [
                  "account_email_change_current",
                  "account_email_change_new",
                ]),
                gt(authChallenges.createdAt, since),
              ),
            )
            .orderBy(desc(authChallenges.createdAt))
            .limit(limit);
        },

        async consumeActiveEmailChangeChallenges(accountId, now) {
          await tx
            .update(authChallenges)
            .set({ consumedAt: now, pendingEmail: null })
            .where(
              and(
                eq(authChallenges.accountId, accountId),
                inArray(authChallenges.purpose, [
                  "account_email_change_current",
                  "account_email_change_new",
                ]),
                isNull(authChallenges.consumedAt),
              ),
            );
        },

        async insertChallenge(input) {
          await tx.insert(authChallenges).values(input);
        },

        async lockActiveChallenge({
          accountId,
          challengeId,
          purpose,
          now,
          maxAttempts,
        }) {
          const [challenge] = await tx
            .select({
              id: authChallenges.id,
              tokenHash: authChallenges.tokenHash,
              pendingEmail: authChallenges.pendingEmail,
              attempts: authChallenges.attempts,
            })
            .from(authChallenges)
            .where(
              and(
                eq(authChallenges.id, challengeId),
                eq(authChallenges.accountId, accountId),
                eq(authChallenges.purpose, purpose),
                isNull(authChallenges.consumedAt),
                gt(authChallenges.expiresAt, now),
                lt(authChallenges.attempts, maxAttempts),
              ),
            )
            .for("update")
            .limit(1);
          return challenge ?? null;
        },

        async recordInvalidCode({
          challengeId,
          now,
          maxAttempts,
          clearPendingEmail,
        }) {
          await tx
            .update(authChallenges)
            .set({
              attempts: sql`${authChallenges.attempts} + 1`,
              ...(clearPendingEmail ? { pendingEmail: null } : {}),
            })
            .where(
              and(
                eq(authChallenges.id, challengeId),
                isNull(authChallenges.consumedAt),
                gt(authChallenges.expiresAt, now),
                lt(authChallenges.attempts, maxAttempts),
              ),
            );
        },

        async consumeCurrentEmailChallenge(challengeId, now) {
          await tx
            .update(authChallenges)
            .set({ consumedAt: now, pendingEmail: null })
            .where(
              and(
                eq(authChallenges.id, challengeId),
                isNull(authChallenges.consumedAt),
              ),
            );
        },

        async consumeNewEmailChallenge({ challengeId, now, maxAttempts }) {
          const [challenge] = await tx
            .update(authChallenges)
            .set({ consumedAt: now, pendingEmail: null })
            .where(
              and(
                eq(authChallenges.id, challengeId),
                isNull(authChallenges.consumedAt),
                gt(authChallenges.expiresAt, now),
                lt(authChallenges.attempts, maxAttempts),
              ),
            )
            .returning({ id: authChallenges.id });
          return Boolean(challenge);
        },

        async updateVerifiedEmail({ accountId, email, now }) {
          try {
            const [updatedEmail] = await tx
              .update(accountEmails)
              .set({
                emailNormalized: email,
                verifiedAt: now,
                updatedAt: now,
              })
              .where(
                and(
                  eq(accountEmails.accountId, accountId),
                  isNotNull(accountEmails.verifiedAt),
                ),
              )
              .returning({ email: accountEmails.emailNormalized });
            return updatedEmail?.email ?? null;
          } catch (error) {
            if (isPostgresUniqueViolation(error)) {
              throw new EmailAddressConflictError();
            }
            throw error;
          }
        },

        async incrementAccountVersion(accountId, now) {
          await tx
            .update(accounts)
            .set({ updatedAt: now, version: sql`${accounts.version} + 1` })
            .where(
              and(eq(accounts.id, accountId), eq(accounts.status, "active")),
            );
        },

        async consumeAllActiveSecurityChallenges(accountId, now) {
          await tx
            .update(authChallenges)
            .set({
              consumedAt: now,
              pendingEmail: null,
              pendingPasswordHash: null,
              basePasswordHash: null,
            })
            .where(
              and(
                eq(authChallenges.accountId, accountId),
                inArray(authChallenges.purpose, [
                  "account_email_change_current",
                  "account_email_change_new",
                  "account_password_change",
                  "password_update",
                  "reset_password",
                  "device_login",
                ]),
                isNull(authChallenges.consumedAt),
              ),
            );
        },
      };

      return operation(transaction);
    });
  },
};
