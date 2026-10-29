export const MAX_SIMULTANEOUS_SESSIONS = 2;

export function selectOldestSessionIdsToRevoke(
  activeSessionsOldestFirst: readonly { id: string }[],
): string[] {
  const sessionsToRevoke = Math.max(
    0,
    activeSessionsOldestFirst.length + 1 - MAX_SIMULTANEOUS_SESSIONS,
  );

  return activeSessionsOldestFirst
    .slice(0, sessionsToRevoke)
    .map((session) => session.id);
}
