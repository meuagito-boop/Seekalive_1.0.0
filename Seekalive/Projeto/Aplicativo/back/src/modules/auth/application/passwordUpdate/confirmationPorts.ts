export type PasswordUpdateOwner = {
  status: string;
  securityLockedAt: Date | null;
  emailVerifiedAt: Date | null;
};

export type PendingPasswordUpdateChallenge = {
  id: string;
  tokenHash: string;
  attempts: number;
  pendingPasswordHash: string | null;
  basePasswordHash: string | null;
};

export type PasswordUpdateTransaction = {
  lockOwner(accountId: string): Promise<PasswordUpdateOwner | null>;
  lockChallenge(input: {
    challengeId: string;
    accountId: string;
    now: Date;
    maxAttempts: number;
  }): Promise<PendingPasswordUpdateChallenge | null>;
  recordInvalidAttempt(input: {
    challengeId: string;
    clearPasswordMaterial: boolean;
  }): Promise<void>;
  consumeChallenge(input: {
    challengeId: string;
    now: Date;
    maxAttempts: number;
  }): Promise<boolean>;
  updatePasswordCredential(input: {
    accountId: string;
    pendingPasswordHash: string;
    basePasswordHash: string;
    passwordPolicyVersion: number;
    now: Date;
  }): Promise<boolean>;
  clearChallengePasswordMaterial(challengeId: string): Promise<void>;
  revokeSessions(accountId: string, now: Date): Promise<void>;
  revokeTrustedDevices(accountId: string, now: Date): Promise<void>;
  consumeRelatedChallenges(accountId: string, now: Date): Promise<void>;
};

export type PasswordUpdateConfirmationRepository = {
  findChallengeOwner(
    challengeId: string,
  ): Promise<{ accountId: string } | null>;
  withTransaction<T>(
    operation: (transaction: PasswordUpdateTransaction) => Promise<T>,
  ): Promise<T>;
};
