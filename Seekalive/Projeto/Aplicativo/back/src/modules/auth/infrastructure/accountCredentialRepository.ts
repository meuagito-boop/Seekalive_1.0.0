import { eq } from "drizzle-orm";
import {
  accountEmails,
  accounts,
  db,
  passwordCredentials,
} from "@workspace/db";

export async function findCurrentPasswordRecord(accountId: string) {
  const [record] = await db
    .select({
      status: accounts.status,
      securityLockedAt: accounts.securityLockedAt,
      email: accountEmails.emailNormalized,
      emailVerifiedAt: accountEmails.verifiedAt,
      displayName: accounts.displayName,
      passwordHash: passwordCredentials.passwordHash,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .innerJoin(
      passwordCredentials,
      eq(passwordCredentials.accountId, accounts.id),
    )
    .where(eq(accounts.id, accountId))
    .limit(1);

  return record ?? null;
}
