export type CurrentPasswordRecord = {
  status: string;
  securityLockedAt: Date | null;
  email: string;
  emailVerifiedAt: Date | null;
  displayName: string;
  passwordHash: string;
};

export type CurrentPasswordReader = (
  accountId: string,
) => Promise<CurrentPasswordRecord | null>;

export type ChallengeInvalidator = (
  challengeId: string,
  accountId: string,
  purpose: string,
) => Promise<void>;

export type AccountSecurityOperations = {
  verifyCurrentPassword: (
    accountId: string,
    currentPassword: string,
  ) => Promise<
    | {
        kind: "verified";
        email: string;
        displayName: string;
        passwordHash: string;
      }
    | { kind: "invalid_credentials" }
    | { kind: "account_unavailable" }
  >;
  invalidateChallenge: ChallengeInvalidator;
};
