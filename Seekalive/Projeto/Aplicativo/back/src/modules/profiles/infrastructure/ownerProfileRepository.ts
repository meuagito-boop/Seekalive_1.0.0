import { and, eq, isNotNull } from "drizzle-orm";
import { accountEmails, accounts, db } from "@workspace/db";
import type { OwnerProfileIdentityRecord } from "../application/ports";

export async function findOwnerProfileIdentity(
  accountId: string,
): Promise<OwnerProfileIdentityRecord | null> {
  const [[owner], [verifiedEmail]] = await Promise.all([
    db
      .select({
        accountType: accounts.accountType,
        firstName: accounts.firstName,
        lastName: accounts.lastName,
        publicNameChangedAt: accounts.publicNameChangedAt,
        usernameChangedAt: accounts.usernameChangedAt,
      })
      .from(accounts)
      .where(eq(accounts.id, accountId))
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

  return owner && verifiedEmail
    ? { ...owner, email: verifiedEmail.email }
    : null;
}
