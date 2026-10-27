import { persistUnfollowAccount } from "../infrastructure/followMutationRepository";

export async function unfollowAccount(actorId: string, targetId: string): Promise<void> {
  await persistUnfollowAccount(actorId, targetId);
}
