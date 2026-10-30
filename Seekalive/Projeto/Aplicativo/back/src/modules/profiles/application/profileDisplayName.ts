export type ProfileDisplayNameReader = (
  accountId: string,
) => Promise<string | null>;

export function createProfileDisplayNameReader(
  readDisplayName: ProfileDisplayNameReader,
) {
  return async function getProfileDisplayName(
    accountId: string,
  ): Promise<string> {
    const displayName = await readDisplayName(accountId);
    if (displayName === null) {
      throw new Error(`Account ${accountId} has no canonical profile record.`);
    }
    return displayName;
  };
}
