import { and, eq, gt, lte } from "drizzle-orm";
import {
  accountEmails,
  accountUsernameReservations,
  accounts,
  type DatabaseTransaction,
} from "@workspace/db";
import type {
  CreatedPendingAccountIdentity,
  PendingAccountIdentityInput,
} from "../application/registrationPorts";
import { lockUsernameClaims } from "./usernameClaimLock";

export async function createPendingAccountIdentity(
  transaction: DatabaseTransaction,
  input: PendingAccountIdentityInput,
): Promise<CreatedPendingAccountIdentity | null> {
  await lockUsernameClaims(transaction, [input.username]);
  const now = new Date();

  await transaction
    .delete(accountUsernameReservations)
    .where(
      and(
        eq(accountUsernameReservations.username, input.username),
        lte(accountUsernameReservations.reservedUntil, now),
      ),
    );

  const [existingUsername] = await transaction
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.username, input.username))
    .limit(1);
  const [activeReservation] = await transaction
    .select({ username: accountUsernameReservations.username })
    .from(accountUsernameReservations)
    .where(
      and(
        eq(accountUsernameReservations.username, input.username),
        gt(accountUsernameReservations.reservedUntil, now),
      ),
    )
    .limit(1);
  if (existingUsername || activeReservation) return null;

  const [created] = await transaction
    .insert(accounts)
    .values({
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      age: input.age,
      acceptedTermsVersion: input.acceptedTermsVersion,
      displayName: input.displayName,
      accountType: input.accountType,
      status: "pending_verification",
    })
    .returning({
      id: accounts.id,
      username: accounts.username,
      displayName: accounts.displayName,
    });
  if (!created) throw new Error("Account insert returned no row.");

  await transaction.insert(accountEmails).values({
    accountId: created.id,
    emailNormalized: input.email,
  });

  return created;
}
