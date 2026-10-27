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
import type { PasswordUpdateConfirmationRepository } from "../application/passwordUpdate/confirmationPorts";

export const passwordUpdateConfirmationRepository: PasswordUpdateConfirmationRepository =
  {
    async findChallengeOwner(challengeId) {
      const [challenge] = await db
        .select({ accountId: authChallenges.accountId })
        .from(authChallenges)
        .where(
          and(
            eq(authChallenges.id, challengeId),
            eq(authChallenges.purpose, "password_update"),
          ),
        )
        .limit(1);

      return challenge ?? null;
    },

    async withTransaction(operation) {
      return db.transaction(async (tx) =>
        operation({
          async lockOwner(accountId) {
            const [account] = await tx
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

            return account ?? null;
          },

          async lockChallenge(input) {
            const [challenge] = await tx
              .select({
                id: authChallenges.id,
                tokenHash: authChallenges.tokenHash,
                attempts: authChallenges.attempts,
                pendingPasswordHash: authChallenges.pendingPasswordHash,
                basePasswordHash: authChallenges.basePasswordHash,
              })
              .from(authChallenges)
              .where(
                and(
                  eq(authChallenges.id, input.challengeId),
                  eq(authChallenges.accountId, input.accountId),
                  eq(authChallenges.purpose, "password_update"),
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
            const update = input.clearPasswordMaterial
              ? {
                  attempts: sql`${authChallenges.attempts} + 1`,
                  pendingPasswordHash: null,
                  basePasswordHash: null,
                }
              : { attempts: sql`${authChallenges.attempts} + 1` };
            await tx
              .update(authChallenges)
              .set(update)
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
              .set({
                consumedAt: input.now,
                pendingPasswordHash: null,
                basePasswordHash: null,
              })
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
            const [credential] = await tx
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

            return Boolean(credential);
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
                consumedAt: now,
                pendingPasswordHash: null,
                basePasswordHash: null,
              })
              .where(
                and(
                  eq(authChallenges.accountId, accountId),
                  inArray(authChallenges.purpose, [
                    "device_login",
                    "password_update",
                    "reset_password",
                  ]),
                  isNull(authChallenges.consumedAt),
                ),
              );
          },
        }),
      );
    },
  };
