import { and, eq } from "drizzle-orm";
import { accountInterests, accounts, db } from "@workspace/db";

export async function completeOnboarding(
  accountId: string,
  input: { interests: string[]; skipped: boolean },
): Promise<number> {
  const interests = input.skipped ? [] : input.interests;
  const completedAt = new Date();

  await db.transaction(async (tx) => {
    await tx.delete(accountInterests).where(eq(accountInterests.accountId, accountId));
    if (interests.length > 0) {
      await tx.insert(accountInterests).values(
        interests.map((interestKey) => ({ accountId, interestKey })),
      );
    }
    await tx
      .update(accounts)
      .set({ onboardingCompletedAt: completedAt, updatedAt: completedAt })
      .where(and(eq(accounts.id, accountId), eq(accounts.status, "active")));
  });

  return interests.length;
}
