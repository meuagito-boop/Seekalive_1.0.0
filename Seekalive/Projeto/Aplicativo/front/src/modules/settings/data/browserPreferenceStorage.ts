export function readBrowserPreference<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(key) ?? "null");
    return stored && typeof stored === "object" ? { ...fallback, ...stored } as T : fallback;
  } catch {
    return fallback;
  }
}

export function writeBrowserPreference<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    console.warn("Could not save Seekalive preferences in this browser.");
  }
}

export function accountPreferenceKey(prefix: string, accountId?: string): string {
  return accountId ? `${prefix}:${accountId}` : prefix;
}
