import type { AccountSocialStats } from "../../social/application/getAccountSocialStats";
import type { RelationshipView } from "../../social/application/relationshipView";
import { canViewPrivateProfileContent } from "../domain/accountVisibility";
import type { PublicAccountRow } from "../domain/publicAccount";

export function buildAccountView(
  row: PublicAccountRow,
  viewerId: string | null,
  relationship: RelationshipView,
  stats: AccountSocialStats,
) {
  const privateDetailsVisible = canViewPrivateProfileContent(
    row.isPrivate,
    viewerId,
    row.id,
    relationship.following,
  );
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    bio: privateDetailsVisible ? row.bio : "",
    avatarUrl: null,
    coverUrl: null,
    location: privateDetailsVisible ? row.locationLabel : null,
    website: privateDetailsVisible ? row.websiteUrl : null,
    accountType: row.accountType,
    isPrivate: row.isPrivate,
    joinedAt: row.createdAt.toISOString(),
    relationship,
    stats,
    version: row.version,
  };
}
