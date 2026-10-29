import { and, eq, gt, ne } from "drizzle-orm";
import { accountUsernameReservations, accounts, db } from "@workspace/db";

export async function isUsernameClaimedOrReserved(
  username: string,
): Promise<boolean> {
  const now = new Date();
  const [[account], [reservation]] = await Promise.all([
    db
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.username, username),
          ne(accounts.status, "deletion_retained"),
        ),
      )
      .limit(1),
    db
      .select({ username: accountUsernameReservations.username })
      .from(accountUsernameReservations)
      .where(
        and(
          eq(accountUsernameReservations.username, username),
          gt(accountUsernameReservations.reservedUntil, now),
        ),
      )
      .limit(1),
  ]);

  return Boolean(account || reservation);
}
