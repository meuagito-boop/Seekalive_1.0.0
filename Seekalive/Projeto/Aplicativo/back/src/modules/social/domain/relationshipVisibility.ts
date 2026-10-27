import type { RelationshipView } from "./relationshipView";

export function canViewRelationshipList(
  viewerId: string | null,
  targetId: string,
  targetIsPrivate: boolean,
  relationship: RelationshipView,
): boolean {
  if (!viewerId) return !targetIsPrivate;
  if (viewerId === targetId) return true;
  if (relationship.blockedByMe || relationship.blockedByThem) return false;
  if (!targetIsPrivate) return true;
  return relationship.following === "accepted";
}
