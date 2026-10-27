import { and, eq, isNotNull } from "drizzle-orm";
import { accountEmails, accounts, commercialProfiles, db } from "@workspace/db";

export async function findOwnerProfileIdentity(accountId: string) {
  const [[owner], [verifiedEmail]] = await Promise.all([
    db.select({
      accountType: accounts.accountType,
      firstName: accounts.firstName,
      lastName: accounts.lastName,
      publicNameChangedAt: accounts.publicNameChangedAt,
      usernameChangedAt: accounts.usernameChangedAt,
    })
      .from(accounts)
      .where(eq(accounts.id, accountId))
      .limit(1),
    db.select({ email: accountEmails.emailNormalized })
      .from(accountEmails)
      .where(and(
        eq(accountEmails.accountId, accountId),
        isNotNull(accountEmails.verifiedAt),
      ))
      .limit(1),
  ]);

  return owner && verifiedEmail ? { ...owner, email: verifiedEmail.email } : null;
}

export async function findCommercialProfileDetails(accountId: string) {
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
