import { and, eq, gt, ne } from "drizzle-orm";
import {
  accountEmails,
  accountUsernameReservations,
  accounts,
  db,
} from "@workspace/db";
import { withProfileDisplayName } from "../../profiles/composition/profileDisplayName";
import type { RegistrationAvailabilityRepository } from "../application/registration/registrationAvailability";

export const registrationAvailabilityRepository: RegistrationAvailabilityRepository =
  {
    async accountExistsByUsername(username) {
      const [account] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(
          and(
            eq(accounts.username, username),
            ne(accounts.status, "deletion_retained"),
          ),
        )
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
          status: accounts.status,
        })
        .from(accounts)
        .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
        .where(eq(accountEmails.emailNormalized, email))
        .limit(1);
      return withProfileDisplayName(account);
    },
  };
