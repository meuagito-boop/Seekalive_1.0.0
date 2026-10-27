import type { CommercialProfileLoader } from "./commercialProfile";
import type { OwnerProfileIdentityLoader } from "./ownerProfileCommon";
import { loadPersonalProfile } from "./personalProfile";

export function createOwnerProfileLoader(dependencies: {
  loadIdentity: OwnerProfileIdentityLoader;
  loadCommercialProfile: CommercialProfileLoader;
}) {
  return async function loadOwnerProfile(accountId: string) {
    const identity = await dependencies.loadIdentity(accountId);
    if (!identity.ok) return identity;
    return identity.accountType === "commercial"
      ? dependencies.loadCommercialProfile(accountId, identity)
      : loadPersonalProfile(identity);
  };
}

export type OwnerProfileLoader = ReturnType<typeof createOwnerProfileLoader>;
