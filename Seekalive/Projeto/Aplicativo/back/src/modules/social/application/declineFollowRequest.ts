import type { RelationshipMutationPort } from "./ports";

export function createDeclineFollowRequest(
  port: Pick<RelationshipMutationPort, "declineFollowRequest">,
) {
  return async (targetId: string, requesterId: string): Promise<void> => {
    await port.declineFollowRequest(targetId, requesterId);
  };
}
