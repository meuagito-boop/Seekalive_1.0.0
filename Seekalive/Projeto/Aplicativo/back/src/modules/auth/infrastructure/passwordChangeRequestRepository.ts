import { and, desc, eq, gt, isNull } from "drizzle-orm";
import {
  accountEmails,
  accounts,
  authChallenges,
  db,
  passwordCredentials,
} from "@workspace/db";
import type { PasswordChangeRequestRepository } from "../application/passwordChange/requestPorts";
import { withProfileDisplayName } from "../../profiles/composition/profileDisplayName";

export const passwordChangeRequestRepository: PasswordChangeRequestRepository =
  {
    async withTransaction(operation) {
      return db.transaction(async (tx) =>
        operation({
          async lockOwner(accountId) {
            const [ownerRow] = await tx
              .select({
                id: accounts.id,
                status: accounts.status,
                securityLockedAt: accounts.securityLockedAt,
                email: accountEmails.emailNormalized,
                emailVerifiedAt: accountEmails.verifiedAt,
                passwordHash: passwordCredentials.passwordHash,
              })
              .from(accounts)
              .innerJoin(
                accountEmails,
                eq(accountEmails.accountId, accounts.id),
              )
              .innerJoin(
                passwordCredentials,
                eq(passwordCredentials.accountId, accounts.id),
              )
              .where(eq(accounts.id, accountId))
              .for("update")
              .limit(1);
            return withProfileDisplayName(ownerRow);
          },

          async findRecentChallenges(input) {
            return tx
              .select({
                createdAt: authChallenges.createdAt,
                resendAvailableAt: authChallenges.resendAvailableAt,
              })
              .from(authChallenges)
              .where(
                and(
                  eq(authChallenges.accountId, input.accountId),
                  eq(authChallenges.purpose, "account_password_change"),
                  gt(authChallenges.createdAt, input.createdAfter),
                ),
              )
              .orderBy(desc(authChallenges.createdAt))
              .limit(input.limit);
          },

          async consumeActiveChallenges(accountId, now) {
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
                  eq(authChallenges.purpose, "account_password_change"),
                  isNull(authChallenges.consumedAt),
                ),
              );
          },

          async createChallenge(input) {
            await tx.insert(authChallenges).values({
              id: input.challengeId,
              accountId: input.accountId,
              purpose: "account_password_change",
              tokenHash: input.tokenHash,
              pendingPasswordHash: input.pendingPasswordHash,
              basePasswordHash: input.basePasswordHash,
              attempts: input.attempts,
              createdAt: input.createdAt,
              expiresAt: input.expiresAt,
              resendAvailableAt: input.resendAvailableAt,
            });
          },
        }),
      );
    },
  };
