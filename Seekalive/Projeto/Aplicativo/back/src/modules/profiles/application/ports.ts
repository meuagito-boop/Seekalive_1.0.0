import type { AccountPatchInput, PrivacyWrite } from "@workspace/api-zod";
import type {
  ProfileUpdateEvaluator,
  ProfileUpdateResult,
} from "./profileUpdateTypes";

export type OwnerProfileIdentityRecord = {
  accountType: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  publicNameChangedAt: Date | null;
  usernameChangedAt: Date | null;
};

export type PrivacySettingsRecord = {
  isPrivate: boolean;
  messagesPolicy: string;
  readReceipts: boolean;
  version: number;
};

export type UsernameClaimLookup = (username: string) => Promise<boolean>;
export type OwnerProfileIdentityReader = (
  accountId: string,
) => Promise<OwnerProfileIdentityRecord | null>;
export type PrivacySettingsReader = (
  accountId: string,
) => Promise<PrivacySettingsRecord | null>;
export type PrivacySettingsWriter = (
  accountId: string,
  input: PrivacyWrite,
) => Promise<{ version: number } | null>;
export type OwnerProfileUpdateWriter = (
  accountId: string,
  patch: AccountPatchInput,
  evaluate: ProfileUpdateEvaluator,
) => Promise<ProfileUpdateResult>;
