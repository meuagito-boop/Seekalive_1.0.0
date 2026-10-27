import type { RelationshipMutationPort } from "./ports";

export function createUnfollowAccount(port: Pick<RelationshipMutationPort, "unfollow">) {
  return async (actorId: string, targetId: string): Promise<void> => {
    await port.unfollow(actorId, targetId);
  };
}
