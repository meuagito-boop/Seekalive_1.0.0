import type { RelationshipMutationPort } from "./ports";

export function createBlockAccount(port: Pick<RelationshipMutationPort, "block">) {
  return (actorId: string, targetId: string): Promise<boolean> => port.block(actorId, targetId);
}
