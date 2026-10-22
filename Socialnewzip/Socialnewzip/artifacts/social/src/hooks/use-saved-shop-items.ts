import { useEffect, useState } from "react";

const KEY = "seekalive-saved-shop-items";

function read(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Saved items live only in this browser (localStorage). */
export function useSavedShopItems() {
  const [ids, setIds] = useState<string[]>(read);
  useEffect(() => {
    try { window.localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ }
  }, [ids]);
  return {
    isSaved: (id: string) => ids.includes(id),
    toggle: (id: string) => setIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id])),
  };
}
