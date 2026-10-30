import { and, eq, isNull } from "drizzle-orm";
import { accountEmails, accounts, authChallenges, db } from "@workspace/db";
import type { DeviceLoginChallengeWriter } from "../application/challenges/ports";
import { withProfileDisplayName } from "../../profiles/composition/profileDisplayName";

export const writeDeviceLoginChallenge: DeviceLoginChallengeWriter = async (
  input,
) =>
  db.transaction(async (tx) => {
    const [accountRow] = await tx
      .select({
        id: accounts.id,
        email: accountEmails.emailNormalized,
        status: accounts.status,
        verifiedAt: accountEmails.verifiedAt,
        securityLockedAt: accounts.securityLockedAt,
      })
      .from(accounts)
      .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
      .where(eq(accounts.id, input.accountId))
      .for("update")
      .limit(1);
    const account = await withProfileDisplayName(accountRow);

    if (
      !account ||
      account.status !== "active" ||
      !account.verifiedAt ||
      account.securityLockedAt
    ) {
      return null;
    }

    await tx
      .update(authChallenges)
      .set({ consumedAt: input.createdAt })
      .where(
        and(
          eq(authChallenges.accountId, input.accountId),
          eq(authChallenges.purpose, "device_login"),
          eq(authChallenges.deviceTokenHash, input.deviceTokenHash),
          isNull(authChallenges.consumedAt),
        ),
      );
    await tx.insert(authChallenges).values({
      id: input.challengeId,
      accountId: input.accountId,
      purpose: "device_login",
      tokenHash: input.tokenHash,
      deviceTokenHash: input.deviceTokenHash,
      attempts: 0,
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
      resendAvailableAt: input.resendAvailableAt,
    });

    return { email: account.email, displayName: account.displayName };
  });

export async function invalidateDeviceLoginChallenge(
  challengeId: string,
): Promise<void> {
  await db
    .update(authChallenges)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(authChallenges.id, challengeId),
        isNull(authChallenges.consumedAt),
      ),
    );
}
