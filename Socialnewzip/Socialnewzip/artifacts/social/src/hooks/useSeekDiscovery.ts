import { useEffect, useMemo, useState } from "react";
import { useSocial } from "@/context/SocialContext";
import { mockUsers } from "@/data/mockData";
import { demoSeekEvents } from "@/data/demoSeekEvents";
import { demoSeekAccounts } from "@/data/demoSeekAccounts";
import { buildSeekItems, defaultDiscoveryFilters, filterDiscovery, validateDiscoveryFilters } from "@/lib/seekDiscovery";
import type { DiscoveryFilters, DiscoveryLocation } from "@/lib/seekDiscovery";
import { readRecentLocations, rememberManualLocation } from "@/services/seekLocationService";

const FILTER_KEY = "seekalive-seek-filters";
const SAVED_KEY = "seekalive-saved-businesses";
const EVENT_SAVED_KEY = "seekalive-seek-saved-events";
const SCROLL_KEY = "seekalive-seek-scroll";
const exampleIds = new Set([...mockUsers, ...demoSeekAccounts].map(user => user.id));
const EXAMPLES_KEY = "seekalive-seek-demo-preview";

function readFilters(): DiscoveryFilters {
  try { return validateDiscoveryFilters(JSON.parse(sessionStorage.getItem(FILTER_KEY) ?? "null")); }
  catch { return { ...defaultDiscoveryFilters }; }
}
function readIds(key: string, storage: "localStorage" | "sessionStorage"): string[] {
  try {
    const value: unknown = JSON.parse(window[storage].getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch { return []; }
}

export function useSeekDiscovery() {
  const { users, reviews } = useSocial();
  const [state, updateState] = useState(readFilters);
  const [location, updateLocation] = useState<DiscoveryLocation | null>(() => readRecentLocations()[0] ?? null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [includeExamples, updateExamples] = useState(() => {
    try { return import.meta.env.DEV && sessionStorage.getItem(EXAMPLES_KEY) !== "false"; }
    catch { return import.meta.env.DEV; }
  });
  const examplesAvailable = import.meta.env.DEV;
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewBusinessId, setReviewBusinessId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState(() => [
    ...readIds(SAVED_KEY, "localStorage"), ...readIds(EVENT_SAVED_KEY, "sessionStorage"),
  ]);
  const items = useMemo(() => buildSeekItems(users, reviews,
    examplesAvailable && includeExamples ? demoSeekEvents.map(event => ({ ...event, isExample: true })) : [],
    exampleIds).filter(item => !item.isExample || (examplesAvailable && includeExamples)), [users, reviews, includeExamples, examplesAvailable]);
  const results = useMemo(() => filterDiscovery(items, state, location), [items, state, location]);

  useEffect(() => {
    const online = () => setOffline(!navigator.onLine);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", online); };
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(state)); }
    catch { setNotice("Não foi possível manter os filtros nesta aba do navegador."); }
  }, [state]);
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
    updateState(previous => {
      const next = { ...previous, ...patch };
      if (patch.tab && patch.tab !== previous.tab) {
        next.category = patch.category ?? "";
        if (patch.tab === "events") { next.minimumRating = 0; next.onlyOpen = false; }
        if (["places", "providers"].includes(patch.tab)) {
          next.eventPrice = "all";
          next.eventPeriod = "all";
          if (next.sort === "date") next.sort = "relevance";
        }
      }
      return validateDiscoveryFilters(next);
    });
  }
  function setIncludeExamples(value: boolean) {
    updateExamples(examplesAvailable && value);
    try { sessionStorage.setItem(EXAMPLES_KEY, String(examplesAvailable && value)); }
    catch { setNotice("Não foi possível manter a opção de exemplos ao sair desta tela."); }
  }
  function selectLocation(next: DiscoveryLocation) {
    if (next.source === "manual") {
      try { rememberManualLocation(next); setNotice(null); }
      catch { setNotice("A cidade foi selecionada, mas não pôde ser mantida ao sair desta tela."); }
    }
    updateLocation(next);
    setLocationOpen(false);
  }
  function toggleSaved(id: string) {
    const item = items.find(candidate => candidate.id === id);
    if (!item) return;
    const next = savedIds.includes(id) ? savedIds.filter(saved => saved !== id) : [...savedIds, id];
    try {
      if (item.kind === "event") sessionStorage.setItem(EVENT_SAVED_KEY, JSON.stringify(next.filter(saved => demoSeekEvents.some(event => event.id === saved))));
      else localStorage.setItem(SAVED_KEY, JSON.stringify(next.filter(saved => !demoSeekEvents.some(event => event.id === saved))));
      setSavedIds(next);
    } catch { setNotice("Não foi possível atualizar os itens salvos. Verifique as permissões de armazenamento do navegador."); }
  }
  const queryHasCity = /\bem\s+\S+/i.test(state.query);
  return {
    items, results, state, setState,
    clearFilters: () => updateState(previous => ({ ...defaultDiscoveryFilters, tab: previous.tab, list: previous.list })),
    location, selectLocation, locationOpen, setLocationOpen, includeExamples, setIncludeExamples, examplesAvailable,
    offline, savedIds, toggleSaved,
    showAllExamples: () => {
      setIncludeExamples(true);
      updateState({ ...defaultDiscoveryFilters });
      updateLocation(null);
    },
    reviewBusiness: users.find(user => user.id === reviewBusinessId && user.accountType === "commercial") ?? null,
    openReviews: setReviewBusinessId, closeReviews: () => setReviewBusinessId(null),
    locationNotice: notice ?? (location?.source === "device"
      ? "A posição do dispositivo foi obtida, mas ainda não há geocodificação reversa nem coordenadas nos cadastros para consultar opções próximas. Selecione uma cidade manualmente. Suas coordenadas não foram enviadas a terceiros nem armazenadas."
      : queryHasCity ? "Citar outra cidade na busca não muda sua região de exploração. Use o seletor de localização para confirmar a mudança." : null),
  };
}
