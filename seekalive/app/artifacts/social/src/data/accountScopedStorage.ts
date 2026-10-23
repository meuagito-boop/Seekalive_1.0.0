import { useEffect, useState } from "react";

export type BrowserStorageKind = "localStorage" | "sessionStorage";

export function accountStorageKey(baseKey: string, accountId?: string | null): string {
  const owner = accountId?.trim() || "guest";
  return `${baseKey}:account:${encodeURIComponent(owner)}`;
}

export function localActorId(accountId?: string | null): string {
  return accountId?.trim() || (import.meta.env.DEV ? "me" : "guest");
}

export function readAccountScopedIds(
  baseKey: string,
  accountId: string,
  storage: BrowserStorageKind = "localStorage",
): string[] {
  if (typeof window === "undefined") return [];
  try {
    const key = accountStorageKey(baseKey, accountId);
    const value: unknown = JSON.parse(window[storage].getItem(key) ?? "[]");
    return Array.isArray(value)
      ? [...new Set(value.filter((item): item is string => typeof item === "string"))]
      : [];
  } catch {
    return [];
  }
}

export function writeAccountScopedIds(
  baseKey: string,
  accountId: string,
  ids: string[],
  storage: BrowserStorageKind = "localStorage",
) {
  if (typeof window === "undefined") return;
  try {
    const key = accountStorageKey(baseKey, accountId);
    window[storage].setItem(key, JSON.stringify([...new Set(ids)]));
  } catch {
    console.warn("Could not save account-specific data in this browser.");
  }
}

/** Keeps browser-only lists separate for each signed-in account. */
export function useAccountScopedIds(
  baseKey: string,
  accountId: string,
  storage: BrowserStorageKind = "localStorage",
) {
  const key = accountStorageKey(baseKey, accountId);
  const [snapshot, setSnapshot] = useState(() => ({ key, ids: readAccountScopedIds(baseKey, accountId, storage) }));
  const ids = snapshot.key === key ? snapshot.ids : readAccountScopedIds(baseKey, accountId, storage);

  useEffect(() => {
    if (snapshot.key !== key) setSnapshot({ key, ids: readAccountScopedIds(baseKey, accountId, storage) });
  }, [baseKey, accountId, key, storage, snapshot.key]);

  function toggle(id: string) {
    const next = ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id];
    writeAccountScopedIds(baseKey, accountId, next, storage);
    setSnapshot({ key, ids: next });
  }

  return { ids, toggle, contains: (id: string) => ids.includes(id) };
}
