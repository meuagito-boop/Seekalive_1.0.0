export type AccountDeletionCodeChallenge = {
  accountId: string;
  challengeId: string;
  purpose: "account_deletion_request" | "account_deletion_restore";
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
};

export type AccountDeletionChallengeWriter = (
  challenge: AccountDeletionCodeChallenge,
) => Promise<{ email: string; displayName: string } | null>;

export type AccountDeletionChallengeInvalidator = (
  challengeId: string,
  purpose: "account_deletion_request" | "account_deletion_restore",
) => Promise<void>;

export type AccountDeletionCodeConfirmation = {
  accountId: string;
  challengeId: string;
  purpose: "account_deletion_request" | "account_deletion_restore";
  tokenHash: string;
  now: Date;
  maximumAttempts: number;
};

export type AccountDeletionCodeConfirmationResult =
  | { kind: "scheduled"; deletionScheduledFor: Date }
  | { kind: "restored" }
  | { kind: "invalid_code" }
  | { kind: "account_unavailable" };

export type AccountDeletionCodeConfirmer = (
  input: AccountDeletionCodeConfirmation,
) => Promise<AccountDeletionCodeConfirmationResult>;
