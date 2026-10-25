import { eq } from "drizzle-orm";
import { commercialProfiles, db } from "@workspace/db";
import {
  type OwnerProfileFailure,
  type OwnerProfileIdentity,
} from "./ownerProfileCommon";

async function loadCommercialProfileDetails(accountId: string) {
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

export async function loadCommercialProfile(
  accountId: string,
  identity: OwnerProfileIdentity,
): Promise<OwnerProfileFailure | {
  ok: true;
  data: OwnerProfileIdentity["data"] & {
    commercialProfile: NonNullable<Awaited<ReturnType<typeof loadCommercialProfileDetails>>>;
  };
}> {
  if (identity.accountType !== "commercial") {
    return {
      ok: false,
      status: 409,
      code: "ACCOUNT_TYPE_MISMATCH",
      message: "Esta conta não possui perfil comercial.",
    };
  }
  const commercialProfile = await loadCommercialProfileDetails(accountId);
  if (
    !commercialProfile?.categoryKey
    || !commercialProfile.discoveryKind
    || !commercialProfile.address
    || !commercialProfile.postalCode
    || !commercialProfile.cityName
    || !commercialProfile.stateName
    || !commercialProfile.countryName
  ) {
    return {
      ok: false,
      status: 500,
      code: "ACCOUNT_PROFILE_INCOMPLETE",
      message: "Não foi possível carregar os dados comerciais desta conta.",
    };
  }
  return { ok: true, data: { ...identity.data, commercialProfile } };
}
