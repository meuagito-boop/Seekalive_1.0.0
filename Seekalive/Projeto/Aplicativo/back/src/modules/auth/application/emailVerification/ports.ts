import type { createSessionMaterial } from "../sessionMaterial";

export type ResendVerificationAccount = {
  id: string;
  displayName: string;
  status: string;
  verifiedAt: Date | null;
};

export type VerificationAccount = ResendVerificationAccount & {
  username: string;
  accountType: string;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  passwordPolicyVersion: number;
};

export type VerificationChallenge = {
  id: string;
  attempts: number;
  tokenHash: string;
};

export type VerificationSession = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
};

export type EmailVerificationDelivery = {
  readonly isConfigured: boolean;
  sendVerificationCode(input: {
    email: string;
    displayName: string;
    code: string;
  }): Promise<void>;
};

export type EmailVerificationTransaction = {
  lockLatestChallenge(input: {
    accountId: string;
    now: Date;
    maxAttempts: number;
  }): Promise<VerificationChallenge | null>;
  recordInvalidAttempt(input: {
    challengeId: string;
    attempts: number;
    now: Date;
    maxAttempts: number;
  }): Promise<void>;
  consumeChallenge(input: {
    challengeId: string;
    now: Date;
    maxAttempts: number;
  }): Promise<boolean>;
  verifyEmail(accountId: string, now: Date): Promise<boolean>;
  activateAccount(accountId: string, now: Date): Promise<boolean>;
  createTrustedDevice(input: {
    accountId: string;
    tokenHash: string;
    now: Date;
  }): Promise<string | null>;
  createSession(input: {
    accountId: string;
    deviceId: string;
    material: ReturnType<typeof createSessionMaterial>;
    passwordPolicyVersion: number;
  }): Promise<VerificationSession | null>;
};

export type EmailVerificationRepository = {
  findResendAccountByEmail(
    email: string,
  ): Promise<ResendVerificationAccount | null>;
  findConfirmationAccountByEmail(
    email: string,
  ): Promise<VerificationAccount | null>;
  replaceChallenge(input: {
    accountId: string;
    tokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<void>;
  withTransaction<T>(
    operation: (tx: EmailVerificationTransaction) => Promise<T>,
  ): Promise<T>;
};
