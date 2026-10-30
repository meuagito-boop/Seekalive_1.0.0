import { eq } from "drizzle-orm";
import {
  accountEmails,
  accounts,
  db,
  passwordCredentials,
} from "@workspace/db";
import { withProfileDisplayName } from "../../profiles/composition/profileDisplayName";

export async function findCurrentPasswordRecord(accountId: string) {
  const [record] = await db
    .select({
      id: accounts.id,
      status: accounts.status,
      securityLockedAt: accounts.securityLockedAt,
      email: accountEmails.emailNormalized,
      emailVerifiedAt: accountEmails.verifiedAt,
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

  return withProfileDisplayName(record);
}
