export type PasswordChangeConfirmationOwner = {
  status: string;
  securityLockedAt: Date | null;
  emailVerifiedAt: Date | null;
};

export type PasswordChangeChallenge = {
  id: string;
  tokenHash: string;
  pendingPasswordHash: string | null;
  basePasswordHash: string | null;
  attempts: number;
};

export type PasswordChangeConfirmationTransaction = {
  lockOwner(accountId: string): Promise<PasswordChangeConfirmationOwner | null>;
  lockChallenge(input: {
    accountId: string;
    challengeId: string;
    now: Date;
    maxAttempts: number;
  }): Promise<PasswordChangeChallenge | null>;
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
    basePasswordHash: string;
    pendingPasswordHash: string;
    passwordPolicyVersion: number;
    now: Date;
  }): Promise<boolean>;
  clearChallengePasswordMaterial(challengeId: string): Promise<void>;
  revokeSessions(accountId: string, now: Date): Promise<void>;
  revokeTrustedDevices(accountId: string, now: Date): Promise<void>;
  consumeRelatedChallenges(accountId: string, now: Date): Promise<void>;
};

export type PasswordChangeConfirmationRepository = {
  withTransaction<T>(
    operation: (
      transaction: PasswordChangeConfirmationTransaction,
    ) => Promise<T>,
  ): Promise<T>;
};
