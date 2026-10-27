import type {
  PasswordResetEmailDelivery,
  PasswordResetRequestDependencies,
} from "./requestPorts";

export function createRequestPasswordReset(
  dependencies: PasswordResetRequestDependencies,
) {
  return async function requestPasswordReset(
    email: string,
    delivery: PasswordResetEmailDelivery,
  ): Promise<void> {
    const account = await dependencies.repository.findAccountByEmail(email);
    if (
      account?.status !== "active" ||
      !account.emailVerifiedAt ||
      account.securityLockedAt
    ) {
      return;
    }

    const challenge = await dependencies.createChallenge(account.id);
    if (!challenge) return;

    void delivery
      .sendPasswordResetCode({ email, code: challenge.code })
      .catch(async () => {
        dependencies.logger.warn(
          { code: "PASSWORD_RESET_EMAIL_FAILED" },
          "Password reset email could not be delivered",
        );
        try {
          await dependencies.invalidateChallenge(
            account.id,
            challenge.tokenHash,
            new Date(),
          );
        } catch {
          dependencies.logger.error(
            { code: "PASSWORD_RESET_CHALLENGE_INVALIDATION_FAILED" },
            "Failed email challenge could not be invalidated",
          );
        }
      });
  };
}
