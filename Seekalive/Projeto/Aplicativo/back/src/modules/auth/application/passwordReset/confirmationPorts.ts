export type PasswordResetAccount = {
  id: string;
  status: string;
  securityLockedAt: Date | null;
  emailVerifiedAt: Date | null;
  passwordHash: string;
};

export type ActivePasswordResetChallenge = {
  id: string;
  tokenHash: string;
};

export type PasswordResetTransaction = {
  lockOwner(accountId: string): Promise<boolean>;
  consumeChallenge(input: {
    challengeId: string;
    accountId: string;
    tokenHash: string;
    now: Date;
    maxAttempts: number;
  }): Promise<boolean>;
  updatePasswordCredential(input: {
    accountId: string;
    currentPasswordHash: string;
    newPasswordHash: string;
    passwordPolicyVersion: number;
    now: Date;
  }): Promise<boolean>;
  revokeSessions(accountId: string, now: Date): Promise<void>;
  revokeTrustedDevices(accountId: string, now: Date): Promise<void>;
  consumeRelatedChallenges(accountId: string, now: Date): Promise<void>;
};

export type PasswordResetConfirmationRepository = {
  findAccountByEmail(email: string): Promise<PasswordResetAccount | null>;
  findActiveChallenge(input: {
    accountId: string;
    now: Date;
    maxAttempts: number;
  }): Promise<ActivePasswordResetChallenge | null>;
  recordInvalidAttempt(input: {
    challengeId: string;
    now: Date;
    maxAttempts: number;
  }): Promise<void>;
  withTransaction<T>(
    operation: (transaction: PasswordResetTransaction) => Promise<T>,
  ): Promise<T>;
};

export type PasswordResetPasswordSecurity = {
  verifyPasswordHash(passwordHash: string, password: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
};
