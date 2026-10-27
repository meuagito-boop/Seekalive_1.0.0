import type { RelationshipMutationPort } from "./ports";

export function createUnblockAccount(port: Pick<RelationshipMutationPort, "unblock">) {
  return async (actorId: string, targetId: string): Promise<void> => {
    await port.unblock(actorId, targetId);
  };
}
