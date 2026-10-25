import { useEffect, useMemo, useState } from "react";
import { useSocial } from "@/context/SocialContext";
import { useAppContext } from "@/context/AppContext";
import { accountStorageKey, localActorId, useAccountScopedIds } from "@/data/accountScopedStorage";
import { buildSeekItems, defaultDiscoveryFilters, filterDiscovery, validateDiscoveryFilters } from "@/lib/seekDiscovery";
import type { DiscoveryFilters, DiscoveryLocation } from "@/lib/seekDiscovery";
import { readRecentLocations, rememberManualLocation } from "@/services/seekLocationService";

const FILTER_KEY = "seekalive-seek-filters";
const SAVED_KEY = "seekalive-saved-businesses";
const EVENT_SAVED_KEY = "seekalive-seek-saved-events";
const SCROLL_KEY = "seekalive-seek-scroll";
const EXAMPLES_KEY = "seekalive-seek-demo-preview";
type DevelopmentSeekFixtures = Pick<
  typeof import("@/data/demo/previewFixtures"),
  "developmentExampleAccountIds" | "developmentSeekEvents"
>;

function readFilters(key: string): DiscoveryFilters {
  try { return validateDiscoveryFilters(JSON.parse(sessionStorage.getItem(key) ?? "null")); }
  catch { return { ...defaultDiscoveryFilters }; }
}

export function useSeekDiscovery() {
  const { users, reviews } = useSocial();
  const { currentUser } = useAppContext();
  const actorId = localActorId(currentUser?.id);
  const filterKey = accountStorageKey(FILTER_KEY, actorId);
  const [filterSnapshot, setFilterSnapshot] = useState(() => ({ key: filterKey, value: readFilters(filterKey) }));
  const state = filterSnapshot.key === filterKey ? filterSnapshot.value : readFilters(filterKey);
  const [locationSnapshot, setLocationSnapshot] = useState<{ accountId: string; value: DiscoveryLocation | null }>(() => ({
    accountId: actorId,
    value: readRecentLocations(actorId)[0] ?? null,
  }));
  const location = locationSnapshot.accountId === actorId
    ? locationSnapshot.value
    : readRecentLocations(actorId)[0] ?? null;
  const { ids: savedBusinesses, toggle: toggleSavedBusiness } =
    useAccountScopedIds(SAVED_KEY, actorId, "localStorage");
  const { ids: savedEvents, toggle: toggleSavedEvent } =
    useAccountScopedIds(EVENT_SAVED_KEY, actorId, "sessionStorage");
  const [locationOpen, setLocationOpen] = useState(false);
  const [developmentFixtures, setDevelopmentFixtures] = useState<DevelopmentSeekFixtures | null>(null);
  const [includeExamples, updateExamples] = useState(() => {
    try { return import.meta.env.DEV && sessionStorage.getItem(EXAMPLES_KEY) !== "false"; }
    catch { return import.meta.env.DEV; }
  });
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewBusinessId, setReviewBusinessId] = useState<string | null>(null);
  const examplesAvailable = import.meta.env.DEV && developmentFixtures !== null;
  const exampleIds = useMemo(
    () => new Set(developmentFixtures?.developmentExampleAccountIds ?? []),
    [developmentFixtures],
  );
  const savedIds = [...savedBusinesses, ...savedEvents];
  const items = useMemo(() => buildSeekItems(users, reviews,
    examplesAvailable && includeExamples
      ? developmentFixtures?.developmentSeekEvents.map(event => ({ ...event, isExample: true })) ?? []
      : [],
    exampleIds).filter(item => !item.isExample || (examplesAvailable && includeExamples)),
  [users, reviews, includeExamples, examplesAvailable, developmentFixtures, exampleIds]);
  const results = useMemo(() => filterDiscovery(items, state, location), [items, state, location]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let active = true;
    void import("@/data/demo/previewFixtures")
      .then(({ developmentExampleAccountIds, developmentSeekEvents }) => {
        if (active) setDevelopmentFixtures({ developmentExampleAccountIds, developmentSeekEvents });
      })
      .catch(() => {
        if (active) setNotice("Os exemplos locais não puderam ser carregados neste ambiente.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const online = () => setOffline(!navigator.onLine);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", online); };
  }, []);
  useEffect(() => {
    if (filterSnapshot.key !== filterKey)
      setFilterSnapshot({ key: filterKey, value: readFilters(filterKey) });
  }, [filterKey, filterSnapshot.key]);
  useEffect(() => {
    if (locationSnapshot.accountId !== actorId)
      setLocationSnapshot({ accountId: actorId, value: readRecentLocations(actorId)[0] ?? null });
  }, [actorId, locationSnapshot.accountId]);
  useEffect(() => {
    let frame = 0;
    try {
      const previous = Number(sessionStorage.getItem(SCROLL_KEY) ?? 0);
      if (Number.isFinite(previous) && previous > 0) frame = requestAnimationFrame(() => window.scrollTo(0, previous));
    } catch { /* Storage may be disabled; discovery remains usable. */ }
    return () => {
      cancelAnimationFrame(frame);
      try { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); } catch { /* No server persistence requested. */ }
    };
  }, []);

  function setState(patch: Partial<DiscoveryFilters>) {
    const next = { ...state, ...patch };
    if (patch.tab && patch.tab !== state.tab) {
      next.category = patch.category ?? "";
      if (patch.tab === "events") { next.minimumRating = 0; next.onlyOpen = false; }
      if (["places", "providers"].includes(patch.tab)) {
        next.eventPrice = "all";
        next.eventPeriod = "all";
        if (next.sort === "date") next.sort = "relevance";
      }
    }
    const validated = validateDiscoveryFilters(next);
    setFilterSnapshot({ key: filterKey, value: validated });
    try { sessionStorage.setItem(filterKey, JSON.stringify(validated)); }
    catch { setNotice("Não foi possível manter os filtros nesta aba do navegador."); }
  }
  function setIncludeExamples(value: boolean) {
    updateExamples(examplesAvailable && value);
    try { sessionStorage.setItem(EXAMPLES_KEY, String(examplesAvailable && value)); }
    catch { setNotice("Não foi possível manter a opção de exemplos ao sair desta tela."); }
  }
  function selectLocation(next: DiscoveryLocation) {
    if (next.source === "manual") {
      try { rememberManualLocation(next, actorId); setNotice(null); }
      catch { setNotice("A cidade foi selecionada, mas não pôde ser mantida ao sair desta tela."); }
    }
    setLocationSnapshot({ accountId: actorId, value: next });
    setLocationOpen(false);
  }
  function toggleSaved(id: string) {
    const item = items.find(candidate => candidate.id === id);
    if (!item) return;
    if (item.kind === "event") toggleSavedEvent(id);
    else toggleSavedBusiness(id);
  }
  const queryHasCity = /\bem\s+\S+/i.test(state.query);
  return {
    items, results, state, setState,
    clearFilters: () => setState({ ...defaultDiscoveryFilters, tab: state.tab, list: state.list }),
    location, selectLocation, locationOpen, setLocationOpen, includeExamples, setIncludeExamples, examplesAvailable,
    offline, savedIds, toggleSaved,
    showAllExamples: () => {
      setIncludeExamples(true);
      setState({ ...defaultDiscoveryFilters });
      setLocationSnapshot({ accountId: actorId, value: null });
    },
    reviewBusiness: users.find(user => user.id === reviewBusinessId && user.accountType === "commercial") ?? null,
    openReviews: setReviewBusinessId, closeReviews: () => setReviewBusinessId(null),
    locationNotice: notice ?? (location?.source === "device"
      ? "A posição do dispositivo foi obtida, mas ainda não há geocodificação reversa nem coordenadas nos cadastros para consultar opções próximas. Selecione uma cidade manualmente. Suas coordenadas não foram enviadas a terceiros nem armazenadas."
      : queryHasCity ? "Citar outra cidade na busca não muda sua região de exploração. Use o seletor de localização para confirmar a mudança." : null),
  };
}
