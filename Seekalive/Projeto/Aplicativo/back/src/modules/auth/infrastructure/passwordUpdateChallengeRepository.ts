import { and, eq, isNull } from "drizzle-orm";
import {
  accountEmails,
  accounts,
  authChallenges,
  db,
  passwordCredentials,
} from "@workspace/db";
import type { PasswordUpdateChallengeWriter } from "../application/challenges/ports";
import { withProfileDisplayName } from "../../profiles/composition/profileDisplayName";

export const writePasswordUpdateChallenge: PasswordUpdateChallengeWriter =
  async (input) =>
    db.transaction(async (tx) => {
      const [accountRow] = await tx
        .select({
          id: accounts.id,
          email: accountEmails.emailNormalized,
          status: accounts.status,
          verifiedAt: accountEmails.verifiedAt,
          securityLockedAt: accounts.securityLockedAt,
          passwordHash: passwordCredentials.passwordHash,
        })
        .from(accounts)
        .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
        .innerJoin(
          passwordCredentials,
          eq(passwordCredentials.accountId, accounts.id),
        )
        .where(eq(accounts.id, input.accountId))
        .for("update")
        .limit(1);
      const account = await withProfileDisplayName(accountRow);
      if (
        !account ||
        account.status !== "active" ||
        !account.verifiedAt ||
        account.securityLockedAt ||
        account.passwordHash !== input.basePasswordHash
      ) {
        return null;
      }

      await tx
        .update(authChallenges)
        .set({
          consumedAt: input.createdAt,
          pendingPasswordHash: null,
          basePasswordHash: null,
        })
        .where(
          and(
            eq(authChallenges.accountId, input.accountId),
            eq(authChallenges.purpose, "password_update"),
            isNull(authChallenges.consumedAt),
          ),
        );
      await tx.insert(authChallenges).values({
        id: input.challengeId,
        accountId: input.accountId,
        purpose: "password_update",
        tokenHash: input.tokenHash,
        pendingPasswordHash: input.pendingPasswordHash,
        basePasswordHash: input.basePasswordHash,
        attempts: 0,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt,
      });

      return { email: account.email, displayName: account.displayName };
    });

export async function invalidatePasswordUpdateChallenge(
  challengeId: string,
): Promise<void> {
  await db
    .update(authChallenges)
    .set({
      consumedAt: new Date(),
      pendingPasswordHash: null,
      basePasswordHash: null,
    })
    .where(
      and(
        eq(authChallenges.id, challengeId),
        eq(authChallenges.purpose, "password_update"),
        isNull(authChallenges.consumedAt),
      ),
    );
}
