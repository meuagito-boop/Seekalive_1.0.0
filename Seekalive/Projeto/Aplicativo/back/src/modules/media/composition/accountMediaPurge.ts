import { localMediaFileStore } from "../infrastructure/localMediaFileStore";
import { listMediaStorageKeysForAccount } from "../infrastructure/mediaAssetRepository";

type ListStorageKeys = (
  ownerAccountId: string,
) => Promise<Array<{ storageKey: string }>>;
type RemoveStorageKey = (storageKey: string) => Promise<void>;

export function createAccountMediaPurger(
  listStorageKeys: ListStorageKeys,
  removeStorageKey: RemoveStorageKey,
  isLocalDevelopment = () => process.env.NODE_ENV === "development",
) {
  return async function purgeAccountMediaFiles(ownerAccountId: string) {
    const assets = await listStorageKeys(ownerAccountId);
    if (assets.length > 0 && !isLocalDevelopment()) {
      throw new Error(
        "Account media purge requires the configured storage provider.",
      );
    }
    for (const asset of assets) {
      await removeStorageKey(asset.storageKey);
    }
  };
}

export const purgeAccountMediaFiles = createAccountMediaPurger(
  listMediaStorageKeysForAccount,
  (storageKey) => localMediaFileStore.remove(storageKey),
);
