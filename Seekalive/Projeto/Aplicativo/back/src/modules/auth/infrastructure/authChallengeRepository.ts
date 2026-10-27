import { and, eq, isNull } from "drizzle-orm";
import { authChallenges, db } from "@workspace/db";

export async function invalidateAuthChallenge(
  challengeId: string,
  accountId: string,
  purpose: string,
): Promise<void> {
  await db
    .update(authChallenges)
    .set({
      consumedAt: new Date(),
      pendingEmail: null,
      pendingPasswordHash: null,
      basePasswordHash: null,
    })
    .where(
      and(
        eq(authChallenges.id, challengeId),
        eq(authChallenges.accountId, accountId),
        eq(authChallenges.purpose, purpose),
        isNull(authChallenges.consumedAt),
      ),
    );
}
