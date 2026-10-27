import type {
  PasswordResetChallengeCreator,
  PasswordResetChallengeInvalidator,
} from "../challenges/ports";

export type PasswordResetRequestAccount = {
  id: string;
  status: string;
  securityLockedAt: Date | null;
  emailVerifiedAt: Date | null;
};

export type PasswordResetRequestRepository = {
  findAccountByEmail(
    email: string,
  ): Promise<PasswordResetRequestAccount | null>;
};

export type PasswordResetEmailDelivery = {
  sendPasswordResetCode(input: { email: string; code: string }): Promise<void>;
};

export type PasswordResetLogger = {
  warn(fields: { code: string }, message: string): void;
  error(fields: { code: string }, message: string): void;
};

export type PasswordResetRequestDependencies = {
  repository: PasswordResetRequestRepository;
  createChallenge: PasswordResetChallengeCreator;
  invalidateChallenge: PasswordResetChallengeInvalidator;
  logger: PasswordResetLogger;
};
