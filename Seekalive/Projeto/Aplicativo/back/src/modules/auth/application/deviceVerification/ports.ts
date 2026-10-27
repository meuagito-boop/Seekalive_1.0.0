import type { createSessionMaterial } from "../sessionMaterial";

export type DeviceVerificationAccount = {
  id: string;
  username: string;
  displayName: string;
  accountType: string;
  status: string;
  securityLockedAt: Date | null;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  verifiedAt: Date | null;
  passwordPolicyVersion: number;
};

export type DeviceVerificationChallenge = {
  id: string;
  tokenHash: string;
  deviceTokenHash: string | null;
  attempts: number;
  expiresAt?: Date;
  resendAvailableAt?: Date | null;
};

export type DeviceVerificationTransaction = {
  lockConfirmationAccount(
    accountId: string,
  ): Promise<DeviceVerificationAccount | null>;
  lockResendAccount(accountId: string): Promise<{
    id: string;
    displayName: string;
    email: string;
    status: string;
    verifiedAt: Date | null;
    securityLockedAt: Date | null;
  } | null>;
  lockConfirmationChallenge(input: {
    challengeId: string;
    accountId: string;
    now: Date;
    maxAttempts: number;
  }): Promise<DeviceVerificationChallenge | null>;
  lockResendChallenge(input: {
    challengeId: string;
    accountId: string;
    now: Date;
    maxAttempts: number;
  }): Promise<DeviceVerificationChallenge | null>;
  recordWrongCode(input: {
    challengeId: string;
    attempts: number;
    resendAvailableAt: Date;
  }): Promise<void>;
  lockAccountAndRevokeAccess(input: {
    accountId: string;
    challengeId: string;
    attempts: number;
    now: Date;
  }): Promise<void>;
  consumeChallenge(input: { challengeId: string; now: Date }): Promise<boolean>;
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
  }): Promise<{
    id: string;
    createdAt: Date;
    expiresAt: Date;
  } | null>;
  updateChallengeForResend(input: {
    challengeId: string;
    tokenHash: string;
    expiresAt: Date;
    resendAvailableAt: Date;
  }): Promise<void>;
};

export type DeviceVerificationRepository = {
  findAccountIdForChallenge(challengeId: string): Promise<string | null>;
  withTransaction<T>(
    operation: (tx: DeviceVerificationTransaction) => Promise<T>,
  ): Promise<T>;
  invalidateChallenge(challengeId: string, now: Date): Promise<void>;
};
