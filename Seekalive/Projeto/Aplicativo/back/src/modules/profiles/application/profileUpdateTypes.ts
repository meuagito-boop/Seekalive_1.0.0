export type ProfileUpdateOwner = {
  accountType: "personal" | "commercial";
  username: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  createdAt: Date;
  publicNameChangedAt: Date | null;
  usernameChangedAt: Date | null;
  version: number;
};

export type ProfileAccountChanges = {
  publicNameChanged: boolean;
  accountFields: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
  };
};

export type ProfileTypeChangeResult =
  | { ok: true; changes: ProfileAccountChanges }
  | { ok: false; kind: "account_field_not_allowed" | "account_name_mismatch" };
