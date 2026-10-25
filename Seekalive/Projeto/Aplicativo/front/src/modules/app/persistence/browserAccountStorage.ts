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

export function readAccountScopedIdsMap(
  baseKey: string,
  storage: BrowserStorageKind = "localStorage",
): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  const prefix = `${baseKey}:account:`;
  const result: Record<string, string[]> = {};
  try {
    const browserStorage = window[storage];
    for (let index = 0; index < browserStorage.length; index += 1) {
      const key = browserStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const accountId = decodeURIComponent(key.slice(prefix.length));
      result[accountId] = readAccountScopedIds(baseKey, accountId, storage);
    }
  } catch {
    console.warn("Could not read account-specific data in this browser.");
  }
  return result;
}
