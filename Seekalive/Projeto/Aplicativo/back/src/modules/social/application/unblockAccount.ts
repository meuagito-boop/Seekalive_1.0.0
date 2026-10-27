import { persistUnblockAccount } from "../infrastructure/blockMutationRepository";

export async function unblockAccount(actorId: string, targetId: string): Promise<void> {
  await persistUnblockAccount(actorId, targetId);
}
