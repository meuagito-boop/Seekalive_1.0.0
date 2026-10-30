import { eq } from "drizzle-orm";
import { commercialProfiles, db } from "@workspace/db";

export async function findCommercialProfileDetailsByAccountId(
  accountId: string,
) {
  const [profile] = await db
    .select({
      categoryKey: commercialProfiles.categoryKey,
      discoveryKind: commercialProfiles.discoveryKind,
      address: commercialProfiles.address,
      postalCode: commercialProfiles.postalCode,
      cityName: commercialProfiles.cityName,
      stateName: commercialProfiles.stateName,
      countryName: commercialProfiles.countryName,
    })
    .from(commercialProfiles)
    .where(eq(commercialProfiles.accountId, accountId))
    .limit(1);

  return profile ?? null;
}
