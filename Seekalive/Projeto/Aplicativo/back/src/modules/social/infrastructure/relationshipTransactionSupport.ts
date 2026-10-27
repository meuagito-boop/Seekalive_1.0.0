import { and, eq, isNotNull, or } from "drizzle-orm";
import { accountBlocks, accountEmails, accounts, db } from "@workspace/db";

export type SocialTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type LockedRelationshipAccount = {
  id: string;
  status: string;
  isPrivate: boolean;
};

export async function lockRelationshipAccounts(
  tx: SocialTransaction,
  firstId: string,
  secondId: string,
): Promise<LockedRelationshipAccount[]> {
  const locked: LockedRelationshipAccount[] = [];
  for (const id of [...new Set([firstId, secondId])].sort()) {
    const [account] = await tx
      .select({ id: accounts.id, status: accounts.status, isPrivate: accounts.isPrivate })
      .from(accounts)
      .where(eq(accounts.id, id))
      .for("update")
      .limit(1);
    if (account) locked.push(account);
  }
  return locked;
}

export async function hasVerifiedActiveAccount(
  tx: SocialTransaction,
  account: LockedRelationshipAccount | undefined,
): Promise<boolean> {
  if (!account || account.status !== "active") return false;
  const [email] = await tx
    .select({ accountId: accountEmails.accountId })
    .from(accountEmails)
    .where(and(eq(accountEmails.accountId, account.id), isNotNull(accountEmails.verifiedAt)))
    .limit(1);
  return Boolean(email);
}

export async function isBlockedInTransaction(
  tx: SocialTransaction,
  firstId: string,
  secondId: string,
): Promise<boolean> {
  const [block] = await tx
    .select({ blockerId: accountBlocks.blockerId })
    .from(accountBlocks)
    .where(or(
      and(eq(accountBlocks.blockerId, firstId), eq(accountBlocks.blockedId, secondId)),
      and(eq(accountBlocks.blockerId, secondId), eq(accountBlocks.blockedId, firstId)),
    ))
    .limit(1);
  return Boolean(block);
}
