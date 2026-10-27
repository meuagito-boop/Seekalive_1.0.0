import { readBlockedBetween } from "../infrastructure/relationshipReadRepository";

export async function isBlockedBetween(
  firstId: string,
  secondId: string,
): Promise<boolean> {
  return readBlockedBetween(firstId, secondId);
}
