import { readRelationshipState } from "../infrastructure/relationshipReadRepository";
import { buildRelationshipView, type RelationshipView } from "../domain/relationshipView";

const emptyRelationship: RelationshipView = {
  following: "none",
  inCircle: false,
  blockedByMe: false,
  blockedByThem: false,
  mutedByMe: false,
};

export async function getRelationshipFor(
  viewerId: string | null,
  targetId: string,
): Promise<RelationshipView> {
  if (!viewerId || viewerId === targetId) return emptyRelationship;

  return buildRelationshipView(await readRelationshipState(viewerId, targetId));
}
