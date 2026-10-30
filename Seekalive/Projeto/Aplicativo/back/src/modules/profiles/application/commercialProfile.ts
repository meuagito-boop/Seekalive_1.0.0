import {
  type OwnerProfileFailure,
  type OwnerProfileIdentity,
} from "./ownerProfileCommon";
import type { CommercialProfileDetailsReader } from "./commercialProfileDetails";

export function createCommercialProfileLoader(
  findCommercialProfileDetails: CommercialProfileDetailsReader,
) {
  return async function loadCommercialProfile(
    accountId: string,
    identity: OwnerProfileIdentity,
  ): Promise<
    | OwnerProfileFailure
    | {
        ok: true;
        data: OwnerProfileIdentity["data"] & {
          commercialProfile: NonNullable<
            Awaited<ReturnType<typeof findCommercialProfileDetails>>
          >;
        };
      }
  > {
    if (identity.accountType !== "commercial") {
      return {
        ok: false,
        status: 409,
        code: "ACCOUNT_TYPE_MISMATCH",
        message: "Esta conta não possui perfil comercial.",
      };
    }
    const commercialProfile = await findCommercialProfileDetails(accountId);
    if (!commercialProfile) {
      return {
        ok: false,
        status: 500,
        code: "ACCOUNT_PROFILE_INCOMPLETE",
        message: "Não foi possível carregar os dados comerciais desta conta.",
      };
    }
    return { ok: true, data: { ...identity.data, commercialProfile } };
  };
}

export type CommercialProfileLoader = ReturnType<
  typeof createCommercialProfileLoader
>;
