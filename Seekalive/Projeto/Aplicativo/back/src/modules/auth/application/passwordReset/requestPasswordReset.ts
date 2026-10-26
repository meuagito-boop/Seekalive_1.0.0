import { and, eq, isNull } from "drizzle-orm";
import { accountEmails, accounts, authChallenges, db } from "@workspace/db";
import { logger } from "../../../../common/logger";
import { createPasswordResetChallenge } from "../challenges/passwordReset";
import type { AuthEmailDelivery } from "../../infrastructure/emailDelivery";

export async function requestPasswordReset(
  email: string,
  delivery: AuthEmailDelivery,
): Promise<void> {
  const [account] = await db
    .select({
      id: accounts.id,
      status: accounts.status,
      securityLockedAt: accounts.securityLockedAt,
      verifiedAt: accountEmails.verifiedAt,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(eq(accountEmails.emailNormalized, email))
    .limit(1);

  if (account?.status !== "active" || !account.verifiedAt || account.securityLockedAt) return;
  const challenge = await createPasswordResetChallenge(account.id);
  if (!challenge) return;

  void delivery.sendPasswordResetCode({ email, code: challenge.code }).catch(async () => {
    logger.warn({ code: "PASSWORD_RESET_EMAIL_FAILED" }, "Password reset email could not be delivered");
    try {
      await db
        .update(authChallenges)
        .set({ consumedAt: new Date() })
        .where(and(
          eq(authChallenges.accountId, account.id),
          eq(authChallenges.purpose, "reset_password"),
          eq(authChallenges.tokenHash, challenge.tokenHash),
          isNull(authChallenges.consumedAt),
        ));
    } catch {
      logger.error({ code: "PASSWORD_RESET_CHALLENGE_INVALIDATION_FAILED" }, "Failed email challenge could not be invalidated");
    }
  });
}
