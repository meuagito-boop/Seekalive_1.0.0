import type { RecentChallenge } from "../accountSecurity/policy";

export type EmailChangePurpose =
  | "account_email_change_current"
  | "account_email_change_new";

export type EmailChangeOwner = {
  id: string;
  status: string;
  securityLockedAt: Date | null;
  email: string;
  emailVerifiedAt: Date | null;
  displayName: string;
  passwordHash: string | null;
};

export type EmailChangeChallenge = {
  id: string;
  tokenHash: string;
  pendingEmail: string | null;
  attempts: number;
};

export type EmailChangeTransaction = {
  lockOwner(accountId: string): Promise<EmailChangeOwner | null>;
  isEmailInUse(email: string): Promise<boolean>;
  findRecentChallenges(input: {
    accountId: string;
    since: Date;
    limit: number;
  }): Promise<RecentChallenge[]>;
  consumeActiveEmailChangeChallenges(
    accountId: string,
    now: Date,
  ): Promise<void>;
  insertChallenge(input: {
    id: string;
    accountId: string;
    purpose: EmailChangePurpose;
    tokenHash: string;
    pendingEmail: string;
    attempts: 0;
    createdAt: Date;
    expiresAt: Date;
    resendAvailableAt: Date;
  }): Promise<void>;
  lockActiveChallenge(input: {
    accountId: string;
    challengeId: string;
    purpose: EmailChangePurpose;
    now: Date;
    maxAttempts: number;
  }): Promise<EmailChangeChallenge | null>;
  recordInvalidCode(input: {
    challengeId: string;
    now: Date;
    maxAttempts: number;
    clearPendingEmail: boolean;
  }): Promise<void>;
  consumeCurrentEmailChallenge(challengeId: string, now: Date): Promise<void>;
  consumeNewEmailChallenge(input: {
    challengeId: string;
    now: Date;
    maxAttempts: number;
  }): Promise<boolean>;
  updateVerifiedEmail(input: {
    accountId: string;
    email: string;
    now: Date;
  }): Promise<string | null>;
  incrementAccountVersion(accountId: string, now: Date): Promise<void>;
  consumeAllActiveSecurityChallenges(
    accountId: string,
    now: Date,
  ): Promise<void>;
};

export type EmailChangeRepository = {
  withTransaction<T>(
    operation: (tx: EmailChangeTransaction) => Promise<T>,
  ): Promise<T>;
};

export type EmailChangeDelivery = {
  isConfigured: boolean;
  sendAccountEmailChangeCurrentCode(input: {
    email: string;
    displayName: string;
    code: string;
  }): Promise<void>;
  sendAccountEmailChangeNewCode(input: {
    email: string;
    displayName: string;
    code: string;
  }): Promise<void>;
  sendAccountEmailChangeSecurityNotice(input: {
    email: string;
    displayName: string;
    newEmailMasked: string;
  }): Promise<void>;
};
