import type { AccountIdentityRecord } from "../../accounts/domain/accountIdentity";

export type ProfilePresentationRecord = {
  accountId: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  bio: string;
  locationLabel: string | null;
  websiteUrl: string | null;
  isPrivate: boolean;
};

export type PublicProfileRecord = AccountIdentityRecord &
  Omit<ProfilePresentationRecord, "accountId" | "firstName" | "lastName">;
