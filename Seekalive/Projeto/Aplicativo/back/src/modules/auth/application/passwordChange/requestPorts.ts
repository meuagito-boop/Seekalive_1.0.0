import type { AccountSecurityOperations } from "../accountSecurity/ports";

export type PasswordChangeOwner = {
  status: string;
  securityLockedAt: Date | null;
  email: string;
  emailVerifiedAt: Date | null;
  displayName: string;
  passwordHash: string;
};

export type RecentPasswordChangeChallenge = {
  createdAt: Date;
  resendAvailableAt: Date | null;
};

export type PasswordChangeRequestTransaction = {
  lockOwner(accountId: string): Promise<PasswordChangeOwner | null>;
  findRecentChallenges(input: {
    accountId: string;
    createdAfter: Date;
    limit: number;
  }): Promise<RecentPasswordChangeChallenge[]>;
  consumeActiveChallenges(accountId: string, now: Date): Promise<void>;
  createChallenge(input: {
    challengeId: string;
    accountId: string;
    tokenHash: string;
    pendingPasswordHash: string;
    basePasswordHash: string;
    attempts: number;
    createdAt: Date;
    expiresAt: Date;
    resendAvailableAt: Date;
  }): Promise<void>;
};

export type PasswordChangeRequestRepository = {
  withTransaction<T>(
    operation: (transaction: PasswordChangeRequestTransaction) => Promise<T>,
  ): Promise<T>;
};

export type PasswordChangeEmailDelivery = {
  readonly isConfigured: boolean;
  sendAccountPasswordChangeCode(input: {
    email: string;
    displayName: string;
    code: string;
  }): Promise<void>;
};

export type PasswordChangeRequestDependencies = {
  repository: PasswordChangeRequestRepository;
  security: AccountSecurityOperations;
  getEmailDelivery(): PasswordChangeEmailDelivery;
};
