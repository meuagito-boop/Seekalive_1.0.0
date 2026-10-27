import { and, eq, gt, lte } from "drizzle-orm";
import {
  accountEmails,
  accountUsernameReservations,
  accounts,
  db,
  passwordCredentials,
} from "@workspace/db";
import { PASSWORD_POLICY_VERSION } from "@workspace/api-zod";
import { lockUsernameClaims } from "../../../accounts/infrastructure/usernameClaimLock";

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PendingAccountInput = {
  username: string;
  email: string;
  passwordHash: string;
  age: number;
  acceptedTermsVersion: string;
  accountType: "personal" | "commercial";
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  initializeProfile?: (transaction: DatabaseTransaction, accountId: string) => Promise<void>;
};

export async function createPendingAccount(input: PendingAccountInput) {
  return db.transaction(async (tx) => {
    await lockUsernameClaims(tx, [input.username]);
    const now = new Date();
    await tx
      .delete(accountUsernameReservations)
      .where(and(
        eq(accountUsernameReservations.username, input.username),
        lte(accountUsernameReservations.reservedUntil, now),
      ));
    const [existingUsername] = await tx
      .select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.username, input.username))
      .limit(1);
    const [activeReservation] = await tx
      .select({ username: accountUsernameReservations.username })
      .from(accountUsernameReservations)
      .where(and(
        eq(accountUsernameReservations.username, input.username),
        gt(accountUsernameReservations.reservedUntil, now),
      ))
      .limit(1);
    if (existingUsername || activeReservation) return null;

    const [created] = await tx
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

    await tx.insert(accountEmails).values({
      accountId: created.id,
      emailNormalized: input.email,
    });
    await tx.insert(passwordCredentials).values({
      accountId: created.id,
      passwordHash: input.passwordHash,
      passwordPolicyVersion: PASSWORD_POLICY_VERSION,
    });

    await input.initializeProfile?.(tx, created.id);
    return created;
  });
}
