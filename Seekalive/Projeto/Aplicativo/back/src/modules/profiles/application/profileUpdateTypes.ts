export type ProfileUpdateOwnerSnapshot = {
  accountType: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  createdAt: Date;
  publicNameChangedAt: Date | null;
  usernameChangedAt: Date | null;
  version: number;
};

export type ProfileUpdateOwner = Omit<ProfileUpdateOwnerSnapshot, "accountType"> & {
  accountType: "personal" | "commercial";
};

export type ProfileAccountChanges = {
  publicNameChanged: boolean;
  profileFields: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
  };
};

export type ProfileTypeChangeResult =
  | { ok: true; changes: ProfileAccountChanges }
  | { ok: false; kind: "account_field_not_allowed" | "account_name_mismatch" };

export type ProfileUpdateResult =
  | { kind: "updated" }
  | { kind: "account_not_found" | "account_type_invalid" | "version_conflict" | "account_field_not_allowed"
      | "account_name_mismatch" | "username_unavailable" | "commercial_profile_missing" }
  | { kind: "name_change_cooldown" | "username_change_cooldown"; availableAt: Date };

export type ProfileUpdateFailure = Exclude<ProfileUpdateResult, { kind: "updated" }>;

export type ProfileUpdateDecision =
  | { kind: "apply"; changes: ProfileAccountChanges }
  | { kind: "reject"; result: ProfileUpdateFailure };

export type ProfileUpdateEvaluator = (
  owner: ProfileUpdateOwnerSnapshot,
  now: Date,
) => ProfileUpdateDecision;
