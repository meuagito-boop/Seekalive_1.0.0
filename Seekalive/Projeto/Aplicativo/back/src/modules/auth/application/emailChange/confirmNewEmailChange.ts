import { and, eq, gt, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { accountEmails, accounts, authChallenges, db } from "@workspace/db";
import { MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS } from "../accountSecurity/policy";
import { isUniqueConstraintError } from "../accountSecurity/policy";
import { maskEmail } from "../emailMasking";
import { constantTimeEquals, hashAccountEmailChangeCode } from "../../../../security/session";
import { getAuthEmailDelivery } from "../../infrastructure/emailDelivery";
import { logger } from "../../../../common/logger";

type ConfirmNewEmailTransactionResult =
  | { kind: "account_unavailable" }
  | { kind: "invalid" }
  | { kind: "email_unavailable" }
  | { kind: "email_unchanged" }
  | { kind: "updated"; oldEmail: string; email: string; displayName: string };

export type ConfirmNewEmailChangeResult =
  | { kind: "account_unavailable" }
  | { kind: "invalid" }
  | { kind: "email_unavailable" }
  | { kind: "email_unchanged" }
  | { kind: "updated"; email: string; securityNoticeSent: boolean };

export async function confirmNewEmailChange(
  accountId: string,
  challengeId: string,
  submittedCode: string,
): Promise<ConfirmNewEmailChangeResult> {
  const now = new Date();
  let result: ConfirmNewEmailTransactionResult;
  try {
    result = await db.transaction(async (tx): Promise<ConfirmNewEmailTransactionResult> => {
      const [owner] = await tx
        .select({
          status: accounts.status,
          securityLockedAt: accounts.securityLockedAt,
          displayName: accounts.displayName,
          currentEmail: accountEmails.emailNormalized,
          emailVerifiedAt: accountEmails.verifiedAt,
        })
        .from(accounts)
        .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
        .where(eq(accounts.id, accountId))
        .for("update")
        .limit(1);
      if (!owner || owner.status !== "active" || !owner.emailVerifiedAt || owner.securityLockedAt) {
        return { kind: "account_unavailable" };
      }
      const [challenge] = await tx
        .select({
          id: authChallenges.id,
          tokenHash: authChallenges.tokenHash,
          pendingEmail: authChallenges.pendingEmail,
          attempts: authChallenges.attempts,
        })
        .from(authChallenges)
        .where(and(
          eq(authChallenges.id, challengeId),
          eq(authChallenges.accountId, accountId),
          eq(authChallenges.purpose, "account_email_change_new"),
          isNull(authChallenges.consumedAt),
          gt(authChallenges.expiresAt, now),
          lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
        ))
        .for("update")
        .limit(1);
      if (!challenge?.pendingEmail) return { kind: "invalid" };

      const expectedHash = hashAccountEmailChangeCode(
        accountId,
        challenge.id,
        "account_email_change_new",
        submittedCode,
      );
      if (!constantTimeEquals(expectedHash, challenge.tokenHash)) {
        await tx
          .update(authChallenges)
          .set({
            attempts: sql`${authChallenges.attempts} + 1`,
            pendingEmail: challenge.attempts + 1 >= MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS ? null : challenge.pendingEmail,
          })
          .where(and(
            eq(authChallenges.id, challenge.id),
            isNull(authChallenges.consumedAt),
            gt(authChallenges.expiresAt, now),
            lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
          ));
        return { kind: "invalid" };
      }

      if (challenge.pendingEmail === owner.currentEmail) {
        await tx
          .update(authChallenges)
          .set({ consumedAt: now, pendingEmail: null })
          .where(and(eq(authChallenges.id, challenge.id), isNull(authChallenges.consumedAt)));
        return { kind: "email_unchanged" };
      }
      const [usedAddress] = await tx
        .select({ accountId: accountEmails.accountId })
        .from(accountEmails)
        .where(eq(accountEmails.emailNormalized, challenge.pendingEmail))
        .limit(1);
      if (usedAddress) {
        await tx
          .update(authChallenges)
          .set({ consumedAt: now, pendingEmail: null })
          .where(and(eq(authChallenges.id, challenge.id), isNull(authChallenges.consumedAt)));
        return { kind: "email_unavailable" };
      }

      const [consumed] = await tx
        .update(authChallenges)
        .set({ consumedAt: now, pendingEmail: null })
        .where(and(
          eq(authChallenges.id, challenge.id),
          isNull(authChallenges.consumedAt),
          gt(authChallenges.expiresAt, now),
          lt(authChallenges.attempts, MAX_ACCOUNT_CHANGE_CODE_ATTEMPTS),
        ))
        .returning({ id: authChallenges.id });
      if (!consumed) return { kind: "invalid" };

      const [updatedEmail] = await tx
        .update(accountEmails)
        .set({
          emailNormalized: challenge.pendingEmail,
          verifiedAt: now,
          updatedAt: now,
        })
        .where(and(eq(accountEmails.accountId, accountId), isNotNull(accountEmails.verifiedAt)))
        .returning({ email: accountEmails.emailNormalized });
      if (!updatedEmail) return { kind: "account_unavailable" };

      await tx
        .update(accounts)
        .set({ updatedAt: now, version: sql`${accounts.version} + 1` })
        .where(and(eq(accounts.id, accountId), eq(accounts.status, "active")));
      await tx
        .update(authChallenges)
        .set({
          consumedAt: now,
          pendingEmail: null,
          pendingPasswordHash: null,
          basePasswordHash: null,
        })
        .where(and(
          eq(authChallenges.accountId, accountId),
          inArray(authChallenges.purpose, [
            "account_email_change_current",
            "account_email_change_new",
            "account_password_change",
            "password_update",
            "reset_password",
            "device_login",
          ]),
          isNull(authChallenges.consumedAt),
        ));
      return {
        kind: "updated",
        oldEmail: owner.currentEmail,
        email: updatedEmail.email,
        displayName: owner.displayName,
      };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) return { kind: "email_unavailable" };
    throw error;
  }

  if (result.kind !== "updated") return result;
  let securityNoticeSent = true;
  try {
    await getAuthEmailDelivery().sendAccountEmailChangeSecurityNotice({
      email: result.oldEmail,
      displayName: result.displayName,
      newEmailMasked: maskEmail(result.email),
    });
  } catch {
    securityNoticeSent = false;
    logger.warn({ code: "ACCOUNT_EMAIL_CHANGE_SECURITY_NOTICE_FAILED" }, "Old-address security notice could not be delivered");
  }
  return { kind: "updated", email: result.email, securityNoticeSent };
}
