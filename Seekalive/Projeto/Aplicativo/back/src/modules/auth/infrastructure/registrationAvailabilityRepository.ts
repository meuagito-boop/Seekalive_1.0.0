import { and, eq, gt } from "drizzle-orm";
import {
  accountEmails,
  accountUsernameReservations,
  accounts,
  db,
} from "@workspace/db";
import type { RegistrationAvailabilityRepository } from "../application/registration/registrationAvailability";

export const registrationAvailabilityRepository: RegistrationAvailabilityRepository =
  {
    async accountExistsByUsername(username) {
      const [account] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.username, username))
        .limit(1);
      return Boolean(account);
    },

    async activeUsernameReservationExists(username, at) {
      const [reservation] = await db
        .select({ username: accountUsernameReservations.username })
        .from(accountUsernameReservations)
        .where(
          and(
            eq(accountUsernameReservations.username, username),
            gt(accountUsernameReservations.reservedUntil, at),
          ),
        )
        .limit(1);
      return Boolean(reservation);
    },

    async findAccountByEmail(email) {
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
    },
  };
