export function canViewPrivateProfileContent(
  isPrivate: boolean,
  viewerId: string | null,
  profileOwnerId: string,
  following: "none" | "pending" | "accepted",
): boolean {
  if (!isPrivate) return true;
  return viewerId === profileOwnerId || following === "accepted";
}
