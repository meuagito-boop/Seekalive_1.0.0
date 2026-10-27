import { persistFollowRequestDecline } from "../infrastructure/followMutationRepository";

export async function declineFollowRequest(targetId: string, requesterId: string): Promise<void> {
  await persistFollowRequestDecline(targetId, requesterId);
}
