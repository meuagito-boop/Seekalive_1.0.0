import { persistBlockAccount } from "../infrastructure/blockMutationRepository";

export async function blockAccount(actorId: string, targetId: string): Promise<boolean> {
  return persistBlockAccount(actorId, targetId);
}
