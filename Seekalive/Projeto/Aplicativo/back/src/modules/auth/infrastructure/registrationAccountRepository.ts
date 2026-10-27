import { and, eq, gt, lte } from "drizzle-orm";
import {
  accountEmails,
  accountUsernameReservations,
  accounts,
  db,
  passwordCredentials,
} from "@workspace/db";
import { PASSWORD_POLICY_VERSION } from "@workspace/api-zod";
import type { PendingAccountInput } from "../application/registration/registrationPorts";
import type { ProfileRegistrationTransaction } from "../../profiles/infrastructure/initializeCommercialProfile";

type RegistrationTransaction = ProfileRegistrationTransaction;

export type RegistrationUsernameClaimLocker = (
  transaction: RegistrationTransaction,
  usernames: readonly string[],
) => Promise<void>;

export type CommercialProfileInitializer = (
  transaction: RegistrationTransaction,
  accountId: string,
  profile: Extract<
    PendingAccountInput,
    { accountType: "commercial" }
  >["commercialProfile"],
) => Promise<void>;

export function createRegistrationAccountRepository(dependencies: {
  lockUsernameClaims: RegistrationUsernameClaimLocker;
  initializeCommercialProfile: CommercialProfileInitializer;
}) {
  return {
    async createPendingAccount(input: PendingAccountInput) {
      return db.transaction(async (transaction) => {
        await dependencies.lockUsernameClaims(transaction, [input.username]);
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
        await transaction.insert(passwordCredentials).values({
          accountId: created.id,
          passwordHash: input.passwordHash,
          passwordPolicyVersion: PASSWORD_POLICY_VERSION,
        });

        if (input.accountType === "commercial") {
          await dependencies.initializeCommercialProfile(
            transaction,
            created.id,
            input.commercialProfile,
          );
        }

        return created;
      });
    },
  };
}
