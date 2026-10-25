import type { OwnerProfileFailure, OwnerProfileIdentity } from "./ownerProfileCommon";

export async function loadPersonalProfile(
  identity: OwnerProfileIdentity,
): Promise<OwnerProfileFailure | { ok: true; data: OwnerProfileIdentity["data"] & { commercialProfile: null } }> {
  if (identity.accountType !== "personal") {
    return {
      ok: false,
      status: 409,
      code: "ACCOUNT_TYPE_MISMATCH",
      message: "Esta conta não possui perfil pessoal.",
    };
  }
  return { ok: true, data: { ...identity.data, commercialProfile: null } };
}
