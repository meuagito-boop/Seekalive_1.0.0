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
import type { PasswordChangeConfirmationRepository } from "../application/passwordChange/confirmationPorts";

export const passwordChangeConfirmationRepository: PasswordChangeConfirmationRepository =
  {
    async withTransaction(operation) {
      return db.transaction(async (tx) =>
        operation({
          async lockOwner(accountId) {
            const [owner] = await tx
              .select({
                status: accounts.status,
                securityLockedAt: accounts.securityLockedAt,
                emailVerifiedAt: accountEmails.verifiedAt,
              })
              .from(accounts)
              .innerJoin(
                accountEmails,
                eq(accountEmails.accountId, accounts.id),
              )
              .where(eq(accounts.id, accountId))
              .for("update")
              .limit(1);
            return owner ?? null;
          },

          async lockChallenge(input) {
            const [challenge] = await tx
              .select({
                id: authChallenges.id,
                tokenHash: authChallenges.tokenHash,
                pendingPasswordHash: authChallenges.pendingPasswordHash,
                basePasswordHash: authChallenges.basePasswordHash,
                attempts: authChallenges.attempts,
              })
              .from(authChallenges)
              .where(
                and(
                  eq(authChallenges.id, input.challengeId),
                  eq(authChallenges.accountId, input.accountId),
                  eq(authChallenges.purpose, "account_password_change"),
                  isNull(authChallenges.consumedAt),
                  gt(authChallenges.expiresAt, input.now),
                  lt(authChallenges.attempts, input.maxAttempts),
                ),
              )
              .for("update")
              .limit(1);
            return challenge ?? null;
          },

          async recordInvalidAttempt(input) {
            const attemptUpdate = input.clearPasswordMaterial
              ? {
                  attempts: sql`${authChallenges.attempts} + 1`,
                  pendingPasswordHash: null,
                  basePasswordHash: null,
                }
              : { attempts: sql`${authChallenges.attempts} + 1` };
            await tx
              .update(authChallenges)
              .set(attemptUpdate)
              .where(
                and(
                  eq(authChallenges.id, input.challengeId),
                  isNull(authChallenges.consumedAt),
                ),
              );
          },

          async consumeChallenge(input) {
            const [consumed] = await tx
              .update(authChallenges)
              .set({ consumedAt: input.now })
              .where(
                and(
                  eq(authChallenges.id, input.challengeId),
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
                passwordHash: input.pendingPasswordHash,
                passwordPolicyVersion: input.passwordPolicyVersion,
                passwordChangedAt: input.now,
              })
              .where(
                and(
                  eq(passwordCredentials.accountId, input.accountId),
                  eq(passwordCredentials.passwordHash, input.basePasswordHash),
                ),
              )
              .returning({ accountId: passwordCredentials.accountId });
            return Boolean(updated);
          },

          async clearChallengePasswordMaterial(challengeId) {
            await tx
              .update(authChallenges)
              .set({
                pendingPasswordHash: null,
                basePasswordHash: null,
              })
              .where(eq(authChallenges.id, challengeId));
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
              .set({
                consumedAt: sql`COALESCE(${authChallenges.consumedAt}, ${now})`,
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
                ),
              );
          },
        }),
      );
    },
  };
