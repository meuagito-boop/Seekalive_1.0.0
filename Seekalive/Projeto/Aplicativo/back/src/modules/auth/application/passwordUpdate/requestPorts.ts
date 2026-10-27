import type {
  ChallengeByIdInvalidator,
  PasswordUpdateChallengeCreator,
} from "../challenges/ports";

export type PasswordUpdateIdentifier =
  | { kind: "email"; value: string }
  | { kind: "username"; value: string };

export type PasswordUpdateRequestAccount = {
  id: string;
  status: string;
  securityLockedAt: Date | null;
  emailVerifiedAt: Date | null;
  email: string;
  displayName: string;
  passwordHash: string;
};

export type PasswordUpdateRequestRepository = {
  findAccountByIdentifier(
    identifier: PasswordUpdateIdentifier,
  ): Promise<PasswordUpdateRequestAccount | null>;
};

export type PasswordUpdateEmailDelivery = {
  readonly isConfigured: boolean;
  sendPasswordUpdateCode(input: {
    email: string;
    displayName: string;
    code: string;
  }): Promise<void>;
};

export type PasswordUpdatePasswordSecurity = {
  getFallbackPasswordHash(): Promise<string>;
  verifyPasswordHash(passwordHash: string, password: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
};

export type PasswordUpdateLogger = {
  warn(fields: { code: string }, message: string): void;
};

export type PasswordUpdateRequestDependencies = {
  repository: PasswordUpdateRequestRepository;
  passwordSecurity: PasswordUpdatePasswordSecurity;
  createChallenge: PasswordUpdateChallengeCreator;
  invalidateChallenge: ChallengeByIdInvalidator;
  logger: PasswordUpdateLogger;
};
