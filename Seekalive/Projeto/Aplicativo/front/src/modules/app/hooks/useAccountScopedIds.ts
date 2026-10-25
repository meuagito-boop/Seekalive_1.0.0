import { useEffect, useState } from "react";
import {
  accountStorageKey,
  readAccountScopedIds,
  writeAccountScopedIds,
  type BrowserStorageKind,
} from "@/modules/app/persistence/browserAccountStorage";

/** Keeps browser-only lists separate for each signed-in account. */
export function useAccountScopedIds(
  baseKey: string,
  accountId: string,
  storage: BrowserStorageKind = "localStorage",
) {
  const key = accountStorageKey(baseKey, accountId);
  const [snapshot, setSnapshot] = useState(() => ({
    key,
    ids: readAccountScopedIds(baseKey, accountId, storage),
  }));
  const ids = snapshot.key === key
    ? snapshot.ids
    : readAccountScopedIds(baseKey, accountId, storage);

  useEffect(() => {
    if (snapshot.key !== key) {
      setSnapshot({ key, ids: readAccountScopedIds(baseKey, accountId, storage) });
    }
  }, [baseKey, accountId, key, storage, snapshot.key]);

  function toggle(id: string) {
    const next = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
    writeAccountScopedIds(baseKey, accountId, next, storage);
    setSnapshot({ key, ids: next });
  }

  return { ids, toggle, contains: (id: string) => ids.includes(id) };
}
