export type DeviceLoginChallengeAccount = {
  email: string;
  displayName: string;
};

export type DeviceLoginChallengeWriter = (input: {
  accountId: string;
  deviceTokenHash: string;
  challengeId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  resendAvailableAt: Date;
}) => Promise<DeviceLoginChallengeAccount | null>;

export type PasswordResetChallengeWriter = (input: {
  accountId: string;
  tokenHash: string;
  now: Date;
  expiresAt: Date;
  oneHourAgo: Date;
  cooldownSince: Date;
  maxRequestsPerHour: number;
}) => Promise<boolean>;

export type PasswordResetChallengeInvalidator = (
  accountId: string,
  tokenHash: string,
  now: Date,
) => Promise<void>;

export type ChallengeByIdInvalidator = (challengeId: string) => Promise<void>;

export type PasswordUpdateChallengeAccount = {
  email: string;
  displayName: string;
};

export type PasswordUpdateChallengeWriter = (input: {
  accountId: string;
  challengeId: string;
  pendingPasswordHash: string;
  basePasswordHash: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
}) => Promise<PasswordUpdateChallengeAccount | null>;

export type PasswordResetChallengeCreator = (
  accountId: string,
) => Promise<{ code: string; tokenHash: string } | null>;

export type DeviceLoginChallengeCreator = (
  accountId: string,
  deviceTokenHash: string,
) => Promise<{
  challengeId: string;
  code: string;
  email: string;
  emailMasked: string;
  displayName: string;
  createdAt: Date;
  expiresAt: Date;
  resendAvailableAt: Date;
} | null>;

export type PasswordUpdateChallengeCreator = (
  accountId: string,
  pendingPasswordHash: string,
  basePasswordHash: string,
) => Promise<{
  challengeId: string;
  code: string;
  email: string;
  emailMasked: string;
  displayName: string;
  expiresAt: Date;
} | null>;
