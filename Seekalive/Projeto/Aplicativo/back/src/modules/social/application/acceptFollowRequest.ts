import { persistFollowRequestAcceptance } from "../infrastructure/followMutationRepository";

export async function acceptFollowRequest(targetId: string, requesterId: string): Promise<boolean> {
  return persistFollowRequestAcceptance(targetId, requesterId);
}
