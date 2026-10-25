import type { AccountPatchInput } from "@workspace/api-zod";
import type { ProfileTypeChangeResult, ProfileUpdateOwner } from "./profileUpdateTypes";

export function preparePersonalProfileUpdate(
  owner: ProfileUpdateOwner,
  patch: AccountPatchInput,
): ProfileTypeChangeResult {
  const hasPersonalNames = patch.firstName !== undefined || patch.lastName !== undefined;
  if (patch.commercialProfile !== undefined || (patch.displayName !== undefined && !hasPersonalNames)) {
    return { ok: false, kind: "account_field_not_allowed" };
  }

  const personalDisplayName = hasPersonalNames
    ? `${patch.firstName} ${patch.lastName}`.trim()
    : undefined;
  if (
    personalDisplayName !== undefined
    && patch.displayName !== undefined
    && patch.displayName !== personalDisplayName
  ) {
    return { ok: false, kind: "account_name_mismatch" };
  }

  const publicNameChanged = patch.firstName !== undefined
    && patch.lastName !== undefined
    && (patch.firstName !== owner.firstName || patch.lastName !== owner.lastName);
  return {
    ok: true,
    changes: {
      publicNameChanged,
      accountFields: personalDisplayName === undefined
        ? {}
        : {
            firstName: patch.firstName,
            lastName: patch.lastName,
            displayName: personalDisplayName,
          },
    },
  };
}
