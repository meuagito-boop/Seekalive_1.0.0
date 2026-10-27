import { persistFollowAccount } from "../infrastructure/followMutationRepository";

export async function followAccount(actorId: string, targetId: string) {
  return persistFollowAccount(actorId, targetId);
}
