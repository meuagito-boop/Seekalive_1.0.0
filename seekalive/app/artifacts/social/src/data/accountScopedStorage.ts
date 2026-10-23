import { useEffect, useState } from "react";

export type BrowserStorageKind = "localStorage" | "sessionStorage";

export function accountStorageKey(baseKey: string, accountId?: string | null): string {
  const owner = accountId?.trim() || "guest";
  return `${baseKey}:account:${encodeURIComponent(owner)}`;
}

export function localActorId(accountId?: string | null): string {
  return accountId?.trim() || (import.meta.env.DEV ? "me" : "guest");
}

function readIds(key: string, storage: BrowserStorageKind): string[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(window[storage].getItem(key) ?? "[]");
    return Array.isArray(value)
      ? [...new Set(value.filter((item): item is string => typeof item === "string"))]
      : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, storage: BrowserStorageKind, ids: string[]) {
  if (typeof window === "undefined") return;
  try {
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
  const [snapshot, setSnapshot] = useState(() => ({ key, ids: readIds(key, storage) }));
  const ids = snapshot.key === key ? snapshot.ids : readIds(key, storage);

  useEffect(() => {
    if (snapshot.key !== key) setSnapshot({ key, ids: readIds(key, storage) });
  }, [key, storage, snapshot.key]);

  function toggle(id: string) {
    const next = ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id];
    writeIds(key, storage, next);
    setSnapshot({ key, ids: next });
  }

  return { ids, toggle, contains: (id: string) => ids.includes(id) };
}
