import { useAppContext } from "@/modules/app/state/AppContext";
import { localActorId } from "@/modules/app/persistence/browserAccountStorage";
import { useAccountScopedIds } from "@/modules/app/hooks/useAccountScopedIds";

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
