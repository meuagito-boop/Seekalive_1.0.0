export type ActiveSessionSummary = {
  id: string;
  createdAt: Date;
  expiresAt: Date;
};

export type SessionManagementRepository = {
  listActiveSessions(
    accountId: string,
    offset: number,
    now: Date,
  ): Promise<ActiveSessionSummary[]>;
  revokeOtherSessions(
    accountId: string,
    currentSessionId: string,
    now: Date,
  ): Promise<{ id: string }[]>;
  revokeSession(
    accountId: string,
    sessionId: string,
    now: Date,
  ): Promise<boolean>;
  revokeSessionByTokenHash(tokenHash: string, now: Date): Promise<void>;
};

export function createSessionManagement(
  repository: SessionManagementRepository,
) {
  return {
    listActiveSessions(accountId: string, offset: number, now = new Date()) {
      return repository.listActiveSessions(accountId, offset, now);
    },
    revokeOtherSessions(
      accountId: string,
      currentSessionId: string,
      now = new Date(),
    ) {
      return repository.revokeOtherSessions(accountId, currentSessionId, now);
    },
    revokeSession(accountId: string, sessionId: string, now = new Date()) {
      return repository.revokeSession(accountId, sessionId, now);
    },
    revokeSessionByTokenHash(tokenHash: string, now = new Date()) {
      return repository.revokeSessionByTokenHash(tokenHash, now);
    },
  };
}
