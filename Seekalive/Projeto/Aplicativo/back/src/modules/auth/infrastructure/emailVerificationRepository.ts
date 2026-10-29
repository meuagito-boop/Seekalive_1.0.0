import { and, desc, eq, gt, isNull, lt } from "drizzle-orm";
import {
  accountEmails,
  accounts,
  authChallenges,
  db,
  passwordCredentials,
  trustedDevices,
} from "@workspace/db";
import type {
  EmailVerificationRepository,
  EmailVerificationTransaction,
} from "../application/emailVerification/ports";
import { createSessionWithLimit } from "./sessionCreationRepository";

export const emailVerificationRepository: EmailVerificationRepository = {
  async findResendAccountByEmail(email) {
    const [account] = await db
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
    return account ?? null;
  },

  async findConfirmationAccountByEmail(email) {
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
      .innerJoin(
        passwordCredentials,
        eq(passwordCredentials.accountId, accounts.id),
      )
      .where(eq(accountEmails.emailNormalized, email))
      .limit(1);
    return account ?? null;
  },

  async replaceChallenge(input) {
    await db.transaction(async (tx) => {
      await tx
        .update(authChallenges)
        .set({ consumedAt: input.now })
        .where(
          and(
            eq(authChallenges.accountId, input.accountId),
            eq(authChallenges.purpose, "verify_email"),
            isNull(authChallenges.consumedAt),
          ),
        );
      await tx.insert(authChallenges).values({
        accountId: input.accountId,
        purpose: "verify_email",
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      });
    });
  },

  async withTransaction<T>(
    operation: (tx: EmailVerificationTransaction) => Promise<T>,
  ): Promise<T> {
    return db.transaction(async (tx) => {
      const transaction: EmailVerificationTransaction = {
        async lockLatestChallenge({ accountId, now, maxAttempts }) {
          const [challenge] = await tx
            .select({
              id: authChallenges.id,
              attempts: authChallenges.attempts,
              tokenHash: authChallenges.tokenHash,
            })
            .from(authChallenges)
            .where(
              and(
                eq(authChallenges.accountId, accountId),
                eq(authChallenges.purpose, "verify_email"),
                isNull(authChallenges.consumedAt),
                gt(authChallenges.expiresAt, now),
                lt(authChallenges.attempts, maxAttempts),
              ),
            )
            .orderBy(desc(authChallenges.createdAt))
            .for("update")
            .limit(1);
          return challenge ?? null;
        },

        async recordInvalidAttempt({
          challengeId,
          attempts,
          now,
          maxAttempts,
        }) {
          await tx
            .update(authChallenges)
            .set({ attempts })
            .where(
              and(
                eq(authChallenges.id, challengeId),
                isNull(authChallenges.consumedAt),
                gt(authChallenges.expiresAt, now),
                lt(authChallenges.attempts, maxAttempts),
              ),
            );
        },

        async consumeChallenge({ challengeId, now, maxAttempts }) {
          const [consumed] = await tx
            .update(authChallenges)
            .set({ consumedAt: now })
            .where(
              and(
                eq(authChallenges.id, challengeId),
                isNull(authChallenges.consumedAt),
                gt(authChallenges.expiresAt, now),
                lt(authChallenges.attempts, maxAttempts),
              ),
            )
            .returning({ id: authChallenges.id });
          return Boolean(consumed);
        },

        async verifyEmail(accountId, now) {
          const [verified] = await tx
            .update(accountEmails)
            .set({ verifiedAt: now, updatedAt: now })
            .where(
              and(
                eq(accountEmails.accountId, accountId),
                isNull(accountEmails.verifiedAt),
              ),
            )
            .returning({ accountId: accountEmails.accountId });
          return Boolean(verified);
        },

        async activateAccount(accountId, now) {
          const [activated] = await tx
            .update(accounts)
            .set({ status: "active", updatedAt: now })
            .where(
              and(
                eq(accounts.id, accountId),
                eq(accounts.status, "pending_verification"),
              ),
            )
            .returning({ id: accounts.id });
          return Boolean(activated);
        },

        async createTrustedDevice({ accountId, tokenHash, now }) {
          const [device] = await tx
            .insert(trustedDevices)
            .values({
              accountId,
              tokenHash,
              createdAt: now,
              lastSeenAt: now,
            })
            .returning({ id: trustedDevices.id });
          return device?.id ?? null;
        },

        async createSession(input) {
          return createSessionWithLimit(tx, input);
        },
      };
      return operation(transaction);
    });
  },
};
