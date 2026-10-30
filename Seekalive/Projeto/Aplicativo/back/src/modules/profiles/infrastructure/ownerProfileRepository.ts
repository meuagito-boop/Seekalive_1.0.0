import { and, eq, isNotNull } from "drizzle-orm";
import { accountEmails, accountProfiles, accounts, db } from "@workspace/db";
import type { OwnerProfileIdentityRecord } from "../application/ports";

export async function findOwnerProfileIdentity(
  accountId: string,
): Promise<OwnerProfileIdentityRecord | null> {
  const [[account], [profile], [verifiedEmail]] = await Promise.all([
    db
      .select({
        accountType: accounts.accountType,
        usernameChangedAt: accounts.usernameChangedAt,
      })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1),
    db
      .select({
        firstName: accountProfiles.firstName,
        lastName: accountProfiles.lastName,
        publicNameChangedAt: accountProfiles.publicNameChangedAt,
      })
      .from(accountProfiles)
      .where(eq(accountProfiles.accountId, accountId))
      .limit(1),
    db
      .select({ email: accountEmails.emailNormalized })
      .from(accountEmails)
      .where(
        and(
          eq(accountEmails.accountId, accountId),
          isNotNull(accountEmails.verifiedAt),
        ),
      )
      .limit(1),
  ]);

  return account && profile && verifiedEmail
    ? { ...account, ...profile, email: verifiedEmail.email }
    : null;
}
