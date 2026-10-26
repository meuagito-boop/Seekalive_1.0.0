import { and, eq, gt } from "drizzle-orm";
import {
  accountEmails,
  accountUsernameReservations,
  accounts,
  db,
} from "@workspace/db";

export async function isRegistrationUsernameUnavailable(username: string): Promise<boolean> {
  const now = new Date();
  const [account] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.username, username))
    .limit(1);
  if (account) return true;

  const [reservation] = await db
    .select({ username: accountUsernameReservations.username })
    .from(accountUsernameReservations)
    .where(and(
      eq(accountUsernameReservations.username, username),
      gt(accountUsernameReservations.reservedUntil, now),
    ))
    .limit(1);
  return Boolean(reservation);
}

export async function findRegistrationEmail(email: string): Promise<{
  id: string;
  displayName: string;
  status: string;
} | null> {
  const [account] = await db
    .select({
      id: accounts.id,
      displayName: accounts.displayName,
      status: accounts.status,
    })
    .from(accounts)
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .where(eq(accountEmails.emailNormalized, email))
    .limit(1);
  return account ?? null;
}
