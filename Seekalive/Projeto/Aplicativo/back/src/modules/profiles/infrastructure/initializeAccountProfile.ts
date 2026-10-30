import { accountProfiles, type DatabaseTransaction } from "@workspace/db";
import type { AccountProfileRegistrationData } from "../domain/accountProfileRegistration";

export async function initializeAccountProfile(
  transaction: DatabaseTransaction,
  accountId: string,
  profile: AccountProfileRegistrationData,
): Promise<void> {
  await transaction.insert(accountProfiles).values({
    accountId,
    ...profile,
  });
}
