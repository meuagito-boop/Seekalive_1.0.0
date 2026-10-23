import { useAppContext } from "@/context/AppContext";
import { localActorId, useAccountScopedIds } from "@/data/accountScopedStorage";

const KEY = "seekalive-saved-shop-items";

/** Saved items live only in this browser (localStorage). */
export function useSavedShopItems() {
  const { currentUser } = useAppContext();
  const { ids, toggle } = useAccountScopedIds(KEY, localActorId(currentUser?.id));
  return {
    isSaved: (id: string) => ids.includes(id),
    toggle,
  };
}
