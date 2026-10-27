import { commercialProfiles, db } from "@workspace/db";
import type { CommercialProfileRegistrationData } from "../domain/commercialProfileRegistration";

export type ProfileRegistrationTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export async function initializeCommercialProfile(
  transaction: ProfileRegistrationTransaction,
  accountId: string,
  profile: CommercialProfileRegistrationData,
): Promise<void> {
  await transaction.insert(commercialProfiles).values({
    accountId,
    ...profile,
  });
}
