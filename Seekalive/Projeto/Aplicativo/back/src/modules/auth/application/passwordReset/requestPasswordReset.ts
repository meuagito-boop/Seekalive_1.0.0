import { eq } from "drizzle-orm";
import { accountEmails, accounts, db } from "@workspace/db";
import { logger } from "../../../../common/logger";
import type {
  PasswordResetChallengeCreator,
  PasswordResetChallengeInvalidator,
} from "../challenges/ports";
import type { AuthEmailDelivery } from "../../infrastructure/emailDelivery";

export async function requestPasswordReset(
  email: string,
  delivery: AuthEmailDelivery,
  dependencies: {
    createChallenge: PasswordResetChallengeCreator;
    invalidateChallenge: PasswordResetChallengeInvalidator;
  },
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
  const challenge = await dependencies.createChallenge(account.id);
  if (!challenge) return;

  void delivery.sendPasswordResetCode({ email, code: challenge.code }).catch(async () => {
    logger.warn({ code: "PASSWORD_RESET_EMAIL_FAILED" }, "Password reset email could not be delivered");
    try {
      await dependencies.invalidateChallenge(
        account.id,
        challenge.tokenHash,
        new Date(),
      );
    } catch {
      logger.error({ code: "PASSWORD_RESET_CHALLENGE_INVALIDATION_FAILED" }, "Failed email challenge could not be invalidated");
    }
  });
}
