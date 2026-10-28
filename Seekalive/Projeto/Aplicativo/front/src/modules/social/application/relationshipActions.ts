import { createBlockActions } from "@/modules/social/application/blockActions";
import { createFollowActions } from "@/modules/social/application/followActions";
import { createFollowRequestActions } from "@/modules/social/application/followRequestActions";
import type { RelationshipActionDependencies } from "@/modules/social/application/relationshipActionDependencies";
import { createRelationshipActionSupport } from "@/modules/social/application/relationshipActionSupport";

export function createSocialRelationshipActions(
  dependencies: RelationshipActionDependencies,
) {
  const support = createRelationshipActionSupport(dependencies);
  return {
    ...createFollowActions(dependencies, support),
    ...createBlockActions(dependencies, support),
    ...createFollowRequestActions(dependencies, support),
  };
}
