import type { RelationshipMutationPort } from "./ports";

export function createFollowAccount(port: Pick<RelationshipMutationPort, "follow">) {
  return (actorId: string, targetId: string) => port.follow(actorId, targetId);
}
