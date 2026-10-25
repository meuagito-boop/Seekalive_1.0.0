import type { AccountPatch, MyAccountResponse } from "@workspace/api-client-react";
import type { User } from "@/data/mockData";
import { buildCommonProfilePatch, normalizeProfileEditUsername } from "./commonProfileEdit";
import type { ProfileEditFormValues } from "./profileEditSchema";

export function validatePersonalProfileName(
  values: ProfileEditFormValues,
): "firstName" | "lastName" | null {
  if (values.firstName.trim().length < 2) return "firstName";
  if (values.lastName.trim().length < 2) return "lastName";
  return null;
}

export function buildPersonalProfilePatch(
  values: ProfileEditFormValues,
  current: MyAccountResponse,
  usernameChanged: boolean,
): AccountPatch {
  const patch = buildCommonProfilePatch(values, current, usernameChanged);
  if (
    values.firstName.trim() !== (current.firstName ?? "")
    || values.lastName.trim() !== (current.lastName ?? "")
  ) {
    patch.firstName = values.firstName.trim();
    patch.lastName = values.lastName.trim();
  }
  return patch;
}

export function buildPersonalPreviewUser(
  values: ProfileEditFormValues,
  current: User,
): User {
  return {
    ...current,
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    displayName: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(),
    username: normalizeProfileEditUsername(values.username),
    bio: values.bio,
    location: values.location || undefined,
    website: values.website || undefined,
  };
}
