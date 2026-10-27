import { and, eq, gt, isNull, lt } from "drizzle-orm";
import {
  accountEmails,
  accounts,
  authChallenges,
  db,
  passwordCredentials,
  sessions,
  trustedDevices,
} from "@workspace/db";
import type {
  DeviceVerificationRepository,
  DeviceVerificationTransaction,
} from "../application/deviceVerification/ports";

export const deviceVerificationRepository: DeviceVerificationRepository = {
  async findAccountIdForChallenge(challengeId) {
    const [challenge] = await db
      .select({ accountId: authChallenges.accountId })
      .from(authChallenges)
      .where(
        and(
          eq(authChallenges.id, challengeId),
          eq(authChallenges.purpose, "device_login"),
        ),
      )
      .limit(1);
    return challenge?.accountId ?? null;
  },

  withTransaction<T>(
    operation: (tx: DeviceVerificationTransaction) => Promise<T>,
  ) {
    return db.transaction(async (tx) => {
      const transaction: DeviceVerificationTransaction = {
        async lockConfirmationAccount(accountId) {
          const [account] = await tx
            .select({
              id: accounts.id,
              username: accounts.username,
              displayName: accounts.displayName,
              accountType: accounts.accountType,
              status: accounts.status,
              securityLockedAt: accounts.securityLockedAt,
              onboardingCompletedAt: accounts.onboardingCompletedAt,
              createdAt: accounts.createdAt,
              verifiedAt: accountEmails.verifiedAt,
              passwordPolicyVersion: passwordCredentials.passwordPolicyVersion,
            })
            .from(accounts)
            .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
            .innerJoin(
              passwordCredentials,
              eq(passwordCredentials.accountId, accounts.id),
            )
            .where(eq(accounts.id, accountId))
            .for("update")
            .limit(1);
          return account ?? null;
        },

        async lockResendAccount(accountId) {
          const [account] = await tx
            .select({
              id: accounts.id,
              displayName: accounts.displayName,
              email: accountEmails.emailNormalized,
              status: accounts.status,
              verifiedAt: accountEmails.verifiedAt,
              securityLockedAt: accounts.securityLockedAt,
            })
            .from(accounts)
            .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
            .where(eq(accounts.id, accountId))
            .for("update")
            .limit(1);
          return account ?? null;
        },

        async lockConfirmationChallenge(input) {
          const [challenge] = await tx
            .select({
              id: authChallenges.id,
              tokenHash: authChallenges.tokenHash,
              deviceTokenHash: authChallenges.deviceTokenHash,
              attempts: authChallenges.attempts,
            })
            .from(authChallenges)
            .where(
              and(
                eq(authChallenges.id, input.challengeId),
                eq(authChallenges.accountId, input.accountId),
                eq(authChallenges.purpose, "device_login"),
                isNull(authChallenges.consumedAt),
                gt(authChallenges.expiresAt, input.now),
                lt(authChallenges.attempts, input.maxAttempts),
              ),
            )
            .for("update")
            .limit(1);
          return challenge ?? null;
        },

        async lockResendChallenge(input) {
          const [challenge] = await tx
            .select({
              id: authChallenges.id,
              attempts: authChallenges.attempts,
              deviceTokenHash: authChallenges.deviceTokenHash,
              expiresAt: authChallenges.expiresAt,
              resendAvailableAt: authChallenges.resendAvailableAt,
              tokenHash: authChallenges.tokenHash,
            })
            .from(authChallenges)
            .where(
              and(
                eq(authChallenges.id, input.challengeId),
                eq(authChallenges.accountId, input.accountId),
                eq(authChallenges.purpose, "device_login"),
                isNull(authChallenges.consumedAt),
                gt(authChallenges.expiresAt, input.now),
                lt(authChallenges.attempts, input.maxAttempts),
              ),
            )
            .for("update")
            .limit(1);
          return challenge ?? null;
        },

        async recordWrongCode(input) {
          await tx
            .update(authChallenges)
            .set({
              attempts: input.attempts,
              resendAvailableAt: input.resendAvailableAt,
            })
            .where(eq(authChallenges.id, input.challengeId));
        },

        async lockAccountAndRevokeAccess(input) {
          await tx
            .update(authChallenges)
            .set({ attempts: input.attempts, consumedAt: input.now })
            .where(eq(authChallenges.id, input.challengeId));
          await tx
            .update(accounts)
            .set({ securityLockedAt: input.now, updatedAt: input.now })
            .where(
              and(
                eq(accounts.id, input.accountId),
                isNull(accounts.securityLockedAt),
              ),
            );
          await tx
            .update(sessions)
            .set({ revokedAt: input.now })
            .where(
              and(
                eq(sessions.accountId, input.accountId),
                isNull(sessions.revokedAt),
              ),
            );
          await tx
            .update(trustedDevices)
            .set({ revokedAt: input.now })
            .where(
              and(
                eq(trustedDevices.accountId, input.accountId),
                isNull(trustedDevices.revokedAt),
              ),
            );
          await tx
            .update(authChallenges)
            .set({ consumedAt: input.now })
            .where(
              and(
                eq(authChallenges.accountId, input.accountId),
                eq(authChallenges.purpose, "device_login"),
                isNull(authChallenges.consumedAt),
              ),
            );
        },

        async consumeChallenge(input) {
          const [challenge] = await tx
            .update(authChallenges)
            .set({ consumedAt: input.now })
            .where(
              and(
                eq(authChallenges.id, input.challengeId),
                isNull(authChallenges.consumedAt),
              ),
            )
            .returning({ id: authChallenges.id });
          return Boolean(challenge);
        },

        async createTrustedDevice(input) {
          const [device] = await tx
            .insert(trustedDevices)
            .values({
              accountId: input.accountId,
              tokenHash: input.tokenHash,
              createdAt: input.now,
              lastSeenAt: input.now,
            })
            .returning({ id: trustedDevices.id });
          return device?.id ?? null;
        },

        async createSession(input) {
          const [session] = await tx
            .insert(sessions)
            .values({
              accountId: input.accountId,
              deviceId: input.deviceId,
              tokenHash: input.material.tokenHash,
              csrfTokenHash: input.material.csrfTokenHash,
              passwordPolicyVersion: input.passwordPolicyVersion,
              createdAt: input.material.createdAt,
              expiresAt: input.material.expiresAt,
            })
            .returning({
              id: sessions.id,
              createdAt: sessions.createdAt,
              expiresAt: sessions.expiresAt,
            });
          return session ?? null;
        },

        async updateChallengeForResend(input) {
          await tx
            .update(authChallenges)
            .set({
              tokenHash: input.tokenHash,
              expiresAt: input.expiresAt,
              resendAvailableAt: input.resendAvailableAt,
            })
            .where(eq(authChallenges.id, input.challengeId));
        },
      };

      return operation(transaction);
    });
  },

  async invalidateChallenge(challengeId, now) {
    await db
      .update(authChallenges)
      .set({ consumedAt: now })
      .where(
        and(
          eq(authChallenges.id, challengeId),
          isNull(authChallenges.consumedAt),
        ),
      );
  },
};
