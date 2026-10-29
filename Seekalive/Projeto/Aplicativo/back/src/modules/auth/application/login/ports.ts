import type { createSessionMaterial } from "../sessionMaterial";
import type { DeviceLoginChallengeCreator } from "../challenges/ports";
import type { ChallengeByIdInvalidator } from "../challenges/ports";

export type LoginAccount = {
  id: string;
  username: string;
  displayName: string;
  accountType: string;
  accountStatus: string;
  securityLockedAt: Date | null;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  email: string;
  emailVerifiedAt: Date | null;
  passwordHash: string;
  passwordPolicyVersion: number;
};

export type LoginSession = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
};

export type LoginTransaction = {
  lockAccountForAuthentication(accountId: string): Promise<{
    status: string;
    verifiedAt: Date | null;
    securityLockedAt: Date | null;
  } | null>;
  findDeletionSchedule(accountId: string): Promise<Date | null>;
  lockPasswordCredential(accountId: string): Promise<{
    passwordHash: string;
    passwordPolicyVersion: number;
  } | null>;
  updatePasswordPolicyVersion(
    accountId: string,
    policyVersion: number,
  ): Promise<void>;
  lockTrustedDevice(
    accountId: string,
    tokenHash: string,
  ): Promise<{ id: string } | null>;
  updateTrustedDeviceLastSeen(deviceId: string, now: Date): Promise<void>;
  createSession(input: {
    accountId: string;
    deviceId: string;
    material: ReturnType<typeof createSessionMaterial>;
    passwordPolicyVersion: number;
  }): Promise<LoginSession | null>;
};

export type LoginRepository = {
  findLoginAccount(input: {
    identifier: string;
    kind: "email" | "username";
  }): Promise<LoginAccount | null>;
  withTransaction<T>(
    operation: (transaction: LoginTransaction) => Promise<T>,
  ): Promise<T>;
};

export type DeviceLoginEmailDelivery = {
  readonly isConfigured: boolean;
  sendDeviceLoginCode(input: {
    email: string;
    displayName: string;
    code: string;
  }): Promise<void>;
};

export type StartDeviceVerificationDependencies = {
  createChallenge: DeviceLoginChallengeCreator;
  invalidateChallenge: ChallengeByIdInvalidator;
  getEmailDelivery(): DeviceLoginEmailDelivery;
};
