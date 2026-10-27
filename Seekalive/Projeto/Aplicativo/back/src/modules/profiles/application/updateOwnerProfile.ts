import type { AccountPatchInput } from "@workspace/api-zod";
import { nextIdentityChangeAt } from "../../accounts/domain/usernamePolicy";
import { prepareCommercialProfileUpdate } from "./commercialProfileUpdate";
import { preparePersonalProfileUpdate } from "./personalProfileUpdate";
import type { OwnerProfileUpdateWriter } from "./ports";
import type {
  ProfileUpdateDecision,
  ProfileUpdateOwner,
  ProfileUpdateOwnerSnapshot,
} from "./profileUpdateTypes";

function isProfileAccountType(
  value: string,
): value is ProfileUpdateOwner["accountType"] {
  return value === "personal" || value === "commercial";
}

function evaluateProfileUpdate(
  owner: ProfileUpdateOwnerSnapshot,
  patch: AccountPatchInput,
  now: Date,
): ProfileUpdateDecision {
  if (!isProfileAccountType(owner.accountType)) {
    return { kind: "reject", result: { kind: "account_type_invalid" } };
  }

  const profileOwner: ProfileUpdateOwner = {
    ...owner,
    accountType: owner.accountType,
  };
  const profileChanges =
    profileOwner.accountType === "personal"
      ? preparePersonalProfileUpdate(profileOwner, patch)
      : prepareCommercialProfileUpdate(profileOwner, patch);
  if (!profileChanges.ok) {
    return { kind: "reject", result: { kind: profileChanges.kind } };
  }

  const usernameChanged =
    patch.username !== undefined && patch.username !== owner.username;
  const publicNameAvailableAt = nextIdentityChangeAt(
    owner.publicNameChangedAt,
    owner.createdAt,
  );
  const usernameAvailableAt = nextIdentityChangeAt(
    owner.usernameChangedAt,
    owner.createdAt,
  );

  if (profileChanges.changes.publicNameChanged && now < publicNameAvailableAt) {
    return {
      kind: "reject",
      result: {
        kind: "name_change_cooldown",
        availableAt: publicNameAvailableAt,
      },
    };
  }
  if (usernameChanged && now < usernameAvailableAt) {
    return {
      kind: "reject",
      result: {
        kind: "username_change_cooldown",
        availableAt: usernameAvailableAt,
      },
    };
  }

  return { kind: "apply", changes: profileChanges.changes };
}

export function createOwnerProfileUpdater(
  persistOwnerProfileUpdate: OwnerProfileUpdateWriter,
) {
  return function updateOwnerProfile(
    accountId: string,
    patch: AccountPatchInput,
  ) {
    return persistOwnerProfileUpdate(accountId, patch, (owner, now) =>
      evaluateProfileUpdate(owner, patch, now),
    );
  };
}

export type OwnerProfileUpdater = ReturnType<typeof createOwnerProfileUpdater>;
