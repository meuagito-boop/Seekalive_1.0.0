export function canViewPrivateProfileContent(
  isPrivate: boolean,
  viewerId: string | null,
  accountId: string,
  followingStatus: string,
) {
  return !isPrivate
    || viewerId === accountId
    || followingStatus === "accepted";
}
