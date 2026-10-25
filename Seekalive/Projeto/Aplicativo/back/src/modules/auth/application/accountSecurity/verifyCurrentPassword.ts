import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { accountEmails, accounts, db, passwordCredentials } from "@workspace/db";

export async function verifyCurrentPassword(accountId: string, currentPassword: string): Promise<
  | { kind: "verified"; email: string; displayName: string; passwordHash: string }
  | { kind: "invalid_credentials" }
  | { kind: "account_unavailable" }
> {
  const [row] = await db
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
    .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
    .where(eq(accounts.id, accountId))
    .limit(1);

  if (!row) return { kind: "invalid_credentials" };
  const valid = await argon2.verify(row.passwordHash, currentPassword).catch(() => false);
  if (!valid) return { kind: "invalid_credentials" };
  if (row.status !== "active" || !row.emailVerifiedAt || row.securityLockedAt) {
    return { kind: "account_unavailable" };
  }
  return {
    kind: "verified",
    email: row.email,
    displayName: row.displayName,
    passwordHash: row.passwordHash,
  };
}
