import type { AccountPatchInput } from "@workspace/api-zod";
import type { ProfileTypeChangeResult, ProfileUpdateOwner } from "./profileUpdateTypes";

export function prepareCommercialProfileUpdate(
  owner: ProfileUpdateOwner,
  patch: AccountPatchInput,
): ProfileTypeChangeResult {
  if (patch.firstName !== undefined || patch.lastName !== undefined) {
    return { ok: false, kind: "account_field_not_allowed" };
  }
  return {
    ok: true,
    changes: {
      publicNameChanged: patch.displayName !== undefined && patch.displayName !== owner.displayName,
      accountFields: patch.displayName === undefined ? {} : { displayName: patch.displayName },
    },
  };
}
