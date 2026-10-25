import type { AccountPatch, MyAccountResponse } from "@workspace/api-client-react";
import type { ProfileEditFormValues } from "./profileEditSchema";

export function normalizeProfileEditUsername(username: string): string {
  return username.trim().replace(/^@/, "").toLowerCase();
}

export function buildCommonProfilePatch(
  values: ProfileEditFormValues,
  current: MyAccountResponse,
  usernameChanged: boolean,
): AccountPatch {
  const patch: AccountPatch = { version: current.account.version };
  if (usernameChanged) {
    patch.username = normalizeProfileEditUsername(values.username);
  }
  if (values.bio.trim() !== current.account.bio) {
    patch.bio = values.bio.trim();
  }
  if ((values.location?.trim() || null) !== (current.account.location ?? null)) {
    patch.location = values.location?.trim() || null;
  }
  if ((values.website?.trim() || null) !== (current.account.website ?? null)) {
    patch.website = values.website?.trim() || null;
  }
  return patch;
}
