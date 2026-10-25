import { loadCommercialProfile } from "./commercialProfile";
import { loadOwnerProfileIdentity } from "./ownerProfileCommon";
import { loadPersonalProfile } from "./personalProfile";

export async function loadOwnerProfile(accountId: string) {
  const identity = await loadOwnerProfileIdentity(accountId);
  if (!identity.ok) return identity;
  return identity.accountType === "commercial"
    ? loadCommercialProfile(accountId, identity)
    : loadPersonalProfile(identity);
}
