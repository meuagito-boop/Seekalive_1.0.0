import type {
  PasswordUpdateEmailDelivery,
  PasswordUpdateRequestDependencies,
} from "./requestPorts";

export type PasswordUpdateRequestResult =
  | { kind: "invalid_credentials" }
  | { kind: "email_not_verified" }
  | { kind: "account_unavailable" }
  | { kind: "locked" }
  | { kind: "password_reuse" }
  | { kind: "delivery_unavailable" }
  | { kind: "credentials_changed" }
  | { kind: "delivery_failed" }
  | {
      kind: "verification_required";
      challengeId: string;
      emailMasked: string;
      expiresAt: Date;
    };

export function createRequestPasswordUpdate(
  dependencies: PasswordUpdateRequestDependencies,
) {
  return async function requestPasswordUpdate(
    rawIdentifier: string,
    currentPassword: string,
    newPassword: string,
    delivery: PasswordUpdateEmailDelivery,
  ): Promise<PasswordUpdateRequestResult> {
    const normalizedIdentifier = rawIdentifier
      .trim()
      .replace(/^@/, "")
      .toLowerCase();
    const identifier = normalizedIdentifier.includes("@")
      ? { kind: "email" as const, value: normalizedIdentifier }
      : { kind: "username" as const, value: normalizedIdentifier };
    const account =
      await dependencies.repository.findAccountByIdentifier(identifier);

    const fallbackHash =
      await dependencies.passwordSecurity.getFallbackPasswordHash();
    const currentPasswordIsValid = await dependencies.passwordSecurity
      .verifyPasswordHash(
        account?.passwordHash ?? fallbackHash,
        currentPassword,
      )
      .catch(() => false);
    if (!account || !currentPasswordIsValid) {
      return { kind: "invalid_credentials" };
    }
    if (account.status === "pending_verification" || !account.emailVerifiedAt) {
      return { kind: "email_not_verified" };
    }
    if (account.status !== "active") return { kind: "account_unavailable" };
    if (account.securityLockedAt) return { kind: "locked" };
    if (
      await dependencies.passwordSecurity
        .verifyPasswordHash(account.passwordHash, newPassword)
        .catch(() => false)
    ) {
      return { kind: "password_reuse" };
    }

    const newPasswordHash =
      await dependencies.passwordSecurity.hashPassword(newPassword);
    if (!delivery.isConfigured) return { kind: "delivery_unavailable" };

    const challenge = await dependencies.createChallenge(
      account.id,
      newPasswordHash,
      account.passwordHash,
    );
    if (!challenge) return { kind: "credentials_changed" };

    try {
      await delivery.sendPasswordUpdateCode({
        email: challenge.email,
        displayName: challenge.displayName,
        code: challenge.code,
      });
    } catch {
      dependencies.logger.warn(
        { code: "PASSWORD_UPDATE_EMAIL_FAILED" },
        "Password update confirmation email could not be delivered",
      );
      await dependencies.invalidateChallenge(challenge.challengeId);
      return { kind: "delivery_failed" };
    }

    return {
      kind: "verification_required",
      challengeId: challenge.challengeId,
      emailMasked: challenge.emailMasked,
      expiresAt: challenge.expiresAt,
    };
  };
}
