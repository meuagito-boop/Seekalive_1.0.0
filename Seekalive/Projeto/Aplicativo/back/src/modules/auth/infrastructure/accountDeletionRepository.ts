import { and, eq, isNull, sql } from "drizzle-orm";
import {
  accountEmails,
  accounts,
  authChallenges,
  db,
  sessions,
} from "@workspace/db";
import { calculateAccountDeletionDeadline } from "../../accounts/domain/accountDeletionPolicy";
import { constantTimeEquals } from "../../../security/tokenHashing";
import type {
  AccountDeletionCodeChallenge,
  AccountDeletionCodeConfirmation,
  AccountDeletionCodeConfirmationResult,
} from "../application/accountDeletion/deletionCodePorts";
import { withProfileDisplayName } from "../../profiles/composition/profileDisplayName";

export async function writeAccountDeletionChallenge(
  challenge: AccountDeletionCodeChallenge,
): Promise<{ email: string; displayName: string } | null> {
  return db.transaction(async (tx) => {
    const [accountRow] = await tx
      .select({
        id: accounts.id,
        email: accountEmails.emailNormalized,
        emailVerifiedAt: accountEmails.verifiedAt,
        status: accounts.status,
        securityLockedAt: accounts.securityLockedAt,
        deletionScheduledFor: accounts.deletionScheduledFor,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(eq(accounts.id, challenge.accountId))
      .for("update")
      .limit(1);
    const account = await withProfileDisplayName(accountRow);

    if (
      !account ||
      (challenge.purpose === "account_deletion_request" &&
        account.status !== "active") ||
      (challenge.purpose === "account_deletion_restore" &&
        (account.status !== "deletion_pending" ||
          !account.deletionScheduledFor ||
          account.deletionScheduledFor.getTime() <=
            challenge.createdAt.getTime())) ||
      !account.emailVerifiedAt ||
      account.securityLockedAt
    ) {
      return null;
    }

    await tx
      .update(authChallenges)
      .set({ consumedAt: challenge.createdAt })
      .where(
        and(
          eq(authChallenges.accountId, challenge.accountId),
          eq(authChallenges.purpose, challenge.purpose),
          isNull(authChallenges.consumedAt),
        ),
      );

    await tx.insert(authChallenges).values({
      id: challenge.challengeId,
      accountId: challenge.accountId,
      purpose: challenge.purpose,
      tokenHash: challenge.tokenHash,
      attempts: 0,
      createdAt: challenge.createdAt,
      expiresAt: challenge.expiresAt,
    });

    return { email: account.email, displayName: account.displayName };
  });
}

export async function invalidateAccountDeletionChallenge(
  challengeId: string,
  purpose: "account_deletion_request" | "account_deletion_restore",
): Promise<void> {
  await db
    .update(authChallenges)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(authChallenges.id, challengeId),
        eq(authChallenges.purpose, purpose),
        isNull(authChallenges.consumedAt),
      ),
    );
}

export async function confirmAccountDeletionCode(
  input: AccountDeletionCodeConfirmation,
): Promise<AccountDeletionCodeConfirmationResult> {
  return db.transaction(async (tx) => {
    const [account] = await tx
      .select({
        status: accounts.status,
        verifiedAt: accountEmails.verifiedAt,
        securityLockedAt: accounts.securityLockedAt,
        deletionRequestedAt: accounts.deletionRequestedAt,
        deletionScheduledFor: accounts.deletionScheduledFor,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(eq(accounts.id, input.accountId))
      .for("update")
      .limit(1);

    if (
      !account ||
      (input.purpose === "account_deletion_request" &&
        (account.status !== "active" ||
          account.deletionRequestedAt ||
          account.deletionScheduledFor)) ||
      (input.purpose === "account_deletion_restore" &&
        (account.status !== "deletion_pending" ||
          !account.deletionRequestedAt ||
          !account.deletionScheduledFor ||
          account.deletionScheduledFor.getTime() <= input.now.getTime())) ||
      !account.verifiedAt ||
      account.securityLockedAt
    ) {
      return { kind: "account_unavailable" };
    }

    const [challenge] = await tx
      .select({
        tokenHash: authChallenges.tokenHash,
        attempts: authChallenges.attempts,
        expiresAt: authChallenges.expiresAt,
        consumedAt: authChallenges.consumedAt,
      })
      .from(authChallenges)
      .where(
        and(
          eq(authChallenges.id, input.challengeId),
          eq(authChallenges.accountId, input.accountId),
          eq(authChallenges.purpose, input.purpose),
        ),
      )
      .for("update")
      .limit(1);

    if (!challenge || challenge.consumedAt) {
      return { kind: "invalid_code" };
    }

    if (
      challenge.expiresAt.getTime() <= input.now.getTime() ||
      challenge.attempts >= input.maximumAttempts
    ) {
      await tx
        .update(authChallenges)
        .set({ consumedAt: input.now })
        .where(eq(authChallenges.id, input.challengeId));
      return { kind: "invalid_code" };
    }

    if (!constantTimeEquals(challenge.tokenHash, input.tokenHash)) {
      const attempts = challenge.attempts + 1;
      await tx
        .update(authChallenges)
        .set({
          attempts,
          consumedAt:
            attempts >= input.maximumAttempts
              ? input.now
              : challenge.consumedAt,
        })
        .where(eq(authChallenges.id, input.challengeId));
      return { kind: "invalid_code" };
    }

    const restoration = input.purpose === "account_deletion_restore";
    const deletionScheduledFor = restoration
      ? null
      : calculateAccountDeletionDeadline(input.now);
    const [updatedAccount] = await tx
      .update(accounts)
      .set({
        status: restoration ? "active" : "deletion_pending",
        deletionRequestedAt: restoration ? null : input.now,
        deletionScheduledFor,
        updatedAt: input.now,
        version: sql`${accounts.version} + 1`,
      })
      .where(
        restoration
          ? and(
              eq(accounts.id, input.accountId),
              eq(accounts.status, "deletion_pending"),
              eq(accounts.deletionScheduledFor, account.deletionScheduledFor!),
            )
          : and(
              eq(accounts.id, input.accountId),
              eq(accounts.status, "active"),
              isNull(accounts.deletionRequestedAt),
              isNull(accounts.deletionScheduledFor),
            ),
      )
      .returning({ id: accounts.id });

    if (!updatedAccount) return { kind: "account_unavailable" };

    if (!restoration) {
      await tx
        .update(sessions)
        .set({ revokedAt: input.now })
        .where(
          and(
            eq(sessions.accountId, input.accountId),
            isNull(sessions.revokedAt),
          ),
        );
    }
    await tx
      .update(authChallenges)
      .set({
        consumedAt: input.now,
        pendingEmail: null,
        pendingPasswordHash: null,
        basePasswordHash: null,
      })
      .where(
        and(
          eq(authChallenges.accountId, input.accountId),
          isNull(authChallenges.consumedAt),
        ),
      );

    return restoration
      ? { kind: "restored" }
      : { kind: "scheduled", deletionScheduledFor: deletionScheduledFor! };
  });
}
