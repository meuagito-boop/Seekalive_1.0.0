import { createProfileDisplayNameReader } from "../application/profileDisplayName";
import { findProfilePresentationByAccountId } from "../infrastructure/profilePresentationRepository";

export const getProfileDisplayName = createProfileDisplayNameReader(
  async (accountId) =>
    (await findProfilePresentationByAccountId(accountId))?.displayName ?? null,
);

export async function withProfileDisplayName<T extends { id: string }>(
  record: T | null | undefined,
): Promise<(T & { displayName: string }) | null> {
  if (!record) return null;
  return {
    ...record,
    displayName: await getProfileDisplayName(record.id),
  };
}
