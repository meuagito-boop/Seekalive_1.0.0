export function getAccountBlockProjection(
  relations: Record<string, string[]>,
  accountId: string,
) {
  const blockedByViewerIds = [...new Set(relations[accountId] ?? [])];
  const blockingViewerIds = Object.entries(relations)
    .filter(([blockerId, targetIds]) => blockerId !== accountId && targetIds.includes(accountId))
    .map(([blockerId]) => blockerId);
  return {
    blockedByViewerIds,
    blockingViewerIds,
    unavailableAccountIds: [...new Set([...blockedByViewerIds, ...blockingViewerIds])],
  };
}
