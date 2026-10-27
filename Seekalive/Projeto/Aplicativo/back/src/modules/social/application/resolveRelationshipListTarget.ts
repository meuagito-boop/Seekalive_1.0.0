import { findActiveAccountById } from "../../accounts/application/accountViews";
import { getRelationshipFor } from "./getRelationshipFor";
import { canViewRelationshipList } from "../domain/relationshipVisibility";

export type RelationshipListTargetResult =
  | { kind: "visible"; viewerId: string | null }
  | { kind: "not_found" }
  | { kind: "private" };

export async function resolveRelationshipListTarget(
  viewerId: string | null,
  targetId: string,
): Promise<RelationshipListTargetResult> {
  const target = await findActiveAccountById(targetId);
  if (!target) return { kind: "not_found" };

  const relationship = viewerId
    ? await getRelationshipFor(viewerId, targetId)
    : {
        following: "none" as const,
        inCircle: false,
        blockedByMe: false,
        blockedByThem: false,
        mutedByMe: false,
      };

  if (relationship.blockedByMe || relationship.blockedByThem) return { kind: "not_found" };
  if (!canViewRelationshipList(viewerId, targetId, target.isPrivate, relationship)) {
    return { kind: "private" };
  }
  return { kind: "visible", viewerId };
}
