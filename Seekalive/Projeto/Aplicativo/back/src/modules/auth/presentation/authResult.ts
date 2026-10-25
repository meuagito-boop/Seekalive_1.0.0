type AccountAuthResult = {
  id: string;
  username: string;
  displayName: string;
  accountType: string;
  createdAt: Date;
  onboardingCompletedAt: Date | null;
};

type SessionAuthResult = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
};

export function authResult(
  account: AccountAuthResult,
  session: SessionAuthResult,
  csrfToken: string,
) {
  return {
    account: {
      id: account.id,
      username: account.username,
      displayName: account.displayName,
      accountType: account.accountType,
      joinedAt: account.createdAt.toISOString(),
      onboardingCompleted: account.onboardingCompletedAt !== null,
    },
    session: {
      id: session.id,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    },
    csrfToken,
    emailVerified: true as const,
  };
}
