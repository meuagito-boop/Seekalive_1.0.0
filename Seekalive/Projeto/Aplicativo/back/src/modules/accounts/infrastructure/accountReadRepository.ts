import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { accountEmails, accounts, db } from "@workspace/db";
import type { PublicAccountRow } from "../domain/publicAccount";

const publicAccountSelection = {
  id: accounts.id,
  username: accounts.username,
  displayName: accounts.displayName,
  bio: accounts.bio,
  locationLabel: accounts.locationLabel,
  websiteUrl: accounts.websiteUrl,
  accountType: accounts.accountType,
  isPrivate: accounts.isPrivate,
  createdAt: accounts.createdAt,
  version: accounts.version,
};

export async function findActiveAccountById(id: string): Promise<PublicAccountRow | null> {
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
): Promise<PublicAccountRow | null> {
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

export async function findActiveAccountsByIds(ids: string[]): Promise<PublicAccountRow[]> {
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
