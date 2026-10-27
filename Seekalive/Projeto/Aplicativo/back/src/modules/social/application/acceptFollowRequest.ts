import type { RelationshipMutationPort } from "./ports";

export function createAcceptFollowRequest(
  port: Pick<RelationshipMutationPort, "acceptFollowRequest">,
) {
  return (targetId: string, requesterId: string): Promise<boolean> =>
    port.acceptFollowRequest(targetId, requesterId);
}
