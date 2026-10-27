import { and, eq } from "drizzle-orm";
import { accountInterests, accounts, db } from "@workspace/db";

export async function persistOnboardingCompletion(
  accountId: string,
  interests: string[],
  completedAt: Date,
): Promise<void> {
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
}
