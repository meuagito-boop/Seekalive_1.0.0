import type { RelationshipActionDependencies } from "@/modules/social/services/relationshipActionDependencies";
import { createBlockActions } from "@/modules/social/services/blockActions";
import { createFollowActions } from "@/modules/social/services/followActions";
import { createFollowRequestActions } from "@/modules/social/services/followRequestActions";

export function createSocialRelationshipActions(dependencies: RelationshipActionDependencies) {
  return {
    ...createFollowActions(dependencies),
    ...createBlockActions(dependencies),
    ...createFollowRequestActions(dependencies),
  };
}
