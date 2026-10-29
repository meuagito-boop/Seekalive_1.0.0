import { commercialProfiles, type DatabaseTransaction } from "@workspace/db";
import type { CommercialProfileRegistrationData } from "../domain/commercialProfileRegistration";

export async function initializeCommercialProfile(
  transaction: DatabaseTransaction,
  accountId: string,
  profile: CommercialProfileRegistrationData,
): Promise<void> {
  await transaction.insert(commercialProfiles).values({
    accountId,
    ...profile,
  });
}
