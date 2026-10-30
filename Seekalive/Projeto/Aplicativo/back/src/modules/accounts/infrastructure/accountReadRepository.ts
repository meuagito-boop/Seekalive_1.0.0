import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { accountEmails, accounts, db } from "@workspace/db";
import type { AccountIdentityRecord } from "../domain/accountIdentity";

const publicAccountSelection = {
  id: accounts.id,
  username: accounts.username,
  accountType: accounts.accountType,
  createdAt: accounts.createdAt,
  version: accounts.version,
};

export async function findActiveAccountById(id: string): Promise<AccountIdentityRecord | null> {
  const [row] = await db
    .select(publicAccountSelection)
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      eq(accounts.id, id),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ))
    .limit(1);
  return row ?? null;
}

export async function findActiveAccountByUsername(
  username: string,
): Promise<AccountIdentityRecord | null> {
  const [row] = await db
    .select(publicAccountSelection)
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      eq(accounts.username, username),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ))
    .limit(1);
  return row ?? null;
}

export async function findActiveAccountsByIds(ids: string[]): Promise<AccountIdentityRecord[]> {
  if (ids.length === 0) return [];
  return db
    .select(publicAccountSelection)
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(and(
      inArray(accounts.id, ids),
      eq(accounts.status, "active"),
      isNotNull(accountEmails.verifiedAt),
    ));
}
