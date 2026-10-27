import { buildRelationshipView, type RelationshipView } from "../domain/relationshipView";
import type { RelationshipReadPort } from "./ports";

const emptyRelationship: RelationshipView = {
  following: "none",
  inCircle: false,
  blockedByMe: false,
  blockedByThem: false,
  mutedByMe: false,
};

export function createGetRelationshipFor(port: Pick<RelationshipReadPort, "readRelationshipState">) {
  return async (viewerId: string | null, targetId: string): Promise<RelationshipView> => {
    if (!viewerId || viewerId === targetId) return emptyRelationship;

    return buildRelationshipView(await port.readRelationshipState(viewerId, targetId));
  };
}
