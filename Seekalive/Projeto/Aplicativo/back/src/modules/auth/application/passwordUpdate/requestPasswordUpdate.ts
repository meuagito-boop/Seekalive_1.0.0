import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { accountEmails, accounts, db, passwordCredentials } from "@workspace/db";
import { logger } from "../../../../common/logger";
import { fallbackPasswordHashPromise, hashPassword } from "../passwordHashing";
import type {
  ChallengeByIdInvalidator,
  PasswordUpdateChallengeCreator,
} from "../challenges/ports";
import type { AuthEmailDelivery } from "../../infrastructure/emailDelivery";

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

export async function requestPasswordUpdate(
  rawIdentifier: string,
  currentPassword: string,
  newPassword: string,
  delivery: AuthEmailDelivery,
  dependencies: {
    createChallenge: PasswordUpdateChallengeCreator;
    invalidateChallenge: ChallengeByIdInvalidator;
  },
): Promise<PasswordUpdateRequestResult> {
  const identifier = rawIdentifier.trim().replace(/^@/, "").toLowerCase();
  const condition = identifier.includes("@")
    ? eq(accountEmails.emailNormalized, identifier)
    : eq(accounts.username, identifier);
  const [row] = await db
    .select({
      id: accounts.id,
      status: accounts.status,
      securityLockedAt: accounts.securityLockedAt,
      emailVerifiedAt: accountEmails.verifiedAt,
      email: accountEmails.emailNormalized,
      displayName: accounts.displayName,
      passwordHash: passwordCredentials.passwordHash,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
    .where(condition)
    .limit(1);

  const fallbackHash = await fallbackPasswordHashPromise;
  const currentPasswordIsValid = await argon2
    .verify(row?.passwordHash ?? fallbackHash, currentPassword)
    .catch(() => false);
  if (!row || !currentPasswordIsValid) return { kind: "invalid_credentials" };
  if (row.status === "pending_verification" || !row.emailVerifiedAt) {
    return { kind: "email_not_verified" };
  }
  if (row.status !== "active") return { kind: "account_unavailable" };
  if (row.securityLockedAt) return { kind: "locked" };
  if (await argon2.verify(row.passwordHash, newPassword).catch(() => false)) {
    return { kind: "password_reuse" };
  }

  const newPasswordHash = await hashPassword(newPassword);
  if (!delivery.isConfigured) return { kind: "delivery_unavailable" };

  const challenge = await dependencies.createChallenge(
    row.id,
    newPasswordHash,
    row.passwordHash,
  );
  if (!challenge) return { kind: "credentials_changed" };
  try {
    await delivery.sendPasswordUpdateCode({
      email: challenge.email,
      displayName: challenge.displayName,
      code: challenge.code,
    });
  } catch {
    logger.warn({ code: "PASSWORD_UPDATE_EMAIL_FAILED" }, "Password update confirmation email could not be delivered");
    await dependencies.invalidateChallenge(challenge.challengeId);
    return { kind: "delivery_failed" };
  }

  return {
    kind: "verification_required",
    challengeId: challenge.challengeId,
    emailMasked: challenge.emailMasked,
    expiresAt: challenge.expiresAt,
  };
}
