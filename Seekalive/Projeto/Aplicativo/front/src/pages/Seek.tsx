import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Info, MapPin, Search, SlidersHorizontal, WifiOff, X } from "lucide-react";
import { useSeekDiscovery } from "@/hooks/useSeekDiscovery";
import type { DiscoveryFilters, SeekDiscoveryItem } from "@/lib/seekDiscovery";
import { BusinessReviewsDialog } from "@/components/seek/BusinessReviewsDialog";
import { DiscoveryCard } from "@/components/seek/DiscoveryCard";
import { DiscoveryCarousel, DiscoveryCarouselItem } from "@/components/seek/DiscoveryCarousel";
import { DiscoveryCategories } from "@/components/seek/DiscoveryCategories";
import type { DiscoveryCategory } from "@/components/seek/DiscoveryCategories";
import { DiscoveryFiltersPanel } from "@/components/seek/DiscoveryFiltersPanel";
import { DiscoveryLocationDialog } from "@/components/seek/DiscoveryLocationDialog";
import { handleTabKeyDown } from "@/lib/tabKeyboard";

type Tab = DiscoveryFilters["tab"];
const TABS: { key: Tab; label: string }[] = [
  { key: "explore", label: "Explorar" },
  { key: "places", label: "Lugares" },
  { key: "providers", label: "Serviços" },
  { key: "events", label: "Eventos" },
];
const KIND_BY_TAB: Record<Exclude<Tab, "explore">, SeekDiscoveryItem["kind"]> = { places: "place", providers: "provider", events: "event" };

export default function Seek() {
  const d = useSeekDiscovery();
  const { state, setState } = d;
  const [showFilters, setShowFilters] = useState(false);

  const categories = useMemo<DiscoveryCategory[]>(() => {
    const map = new Map<string, DiscoveryCategory>();
    for (const it of d.items) {
      const c = map.get(it.categoryKey);
      if (c) c.count += 1; else map.set(it.categoryKey, { key: it.categoryKey, label: it.category, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [d.items]);

  const byKind = (k: SeekDiscoveryItem["kind"]) => d.results.filter((r) => r.kind === k);
  const providers = byKind("provider");
  const places = byKind("place");
  const events = byKind("event");

  const activeFilters =
    (state.category ? 1 : 0) + (state.minimumRating ? 1 : 0) + (state.onlyOpen ? 1 : 0) +
    (state.eventPrice !== "all" ? 1 : 0) + (state.eventPeriod !== "all" ? 1 : 0) + (state.sort !== "relevance" ? 1 : 0);
  const filterLabels = [
    state.minimumRating > 0 ? `Nota mínima ${state.minimumRating.toLocaleString("pt-BR")}` : "",
    state.onlyOpen ? "Situação informada: aberto" : "",
    state.eventPrice !== "all" ? `Eventos ${state.eventPrice === "free" ? "gratuitos" : "pagos"}` : "",
    state.eventPeriod !== "all" ? (state.eventPeriod === "weekend" ? "Este fim de semana" : "Próximos eventos") : "",
    state.sort !== "relevance" ? `Ordem: ${{ rating: "melhor avaliação", name: "nome", date: "data" }[state.sort]}` : "",
  ].filter(Boolean);

  const listItems = state.tab === "explore" ? d.results : d.results.filter((r) => r.kind === KIND_BY_TAB[state.tab as Exclude<Tab, "explore">]);
  const showList = state.list || state.query.trim().length > 0;

  const card = (it: SeekDiscoveryItem, variant: "carousel" | "list") => (
    <DiscoveryCard
      item={it}
      variant={variant}
      saved={d.savedIds.includes(it.id)}
      onToggleSave={() => d.toggleSaved(it.id)}
      onOpenReviews={it.kind !== "event" && it.accountId && !it.isExample ? () => d.openReviews(it.accountId!) : undefined}
    />
  );

  const rail = (id: string, title: string, subtitle: string, items: SeekDiscoveryItem[], tab: Tab) =>
    items.length ? (
      <DiscoveryCarousel id={id} title={title} subtitle={subtitle} count={items.length} onSeeAll={() => setState({ tab, list: true })}>
        {items.slice(0, 12).map((it) => <DiscoveryCarouselItem key={it.id}>{card(it, "carousel")}</DiscoveryCarouselItem>)}
      </DiscoveryCarousel>
    ) : null;

  const showRail = (t: Tab) => state.tab === "explore" || state.tab === t;
  const panelContent = (
    <>
      {showFilters && <div className="mt-3 px-3 md:px-0"><DiscoveryFiltersPanel state={state} setState={setState} clearFilters={d.clearFilters} /></div>}

      <DiscoveryCategories categories={categories} active={state.category} onSelect={(category) => setState({ category })} />
      {filterLabels.length > 0 && <p className="px-3 pb-2 text-xs text-muted-foreground md:px-0">Filtros ativos: {filterLabels.join(" · ")}</p>}

      {d.examplesAvailable && (
        <div className="mx-3 mb-2 rounded-xl border border-primary/20 bg-primary/5 px-3 md:mx-0">
          <label className="flex min-h-11 items-center gap-3 text-xs text-muted-foreground">
            <input type="checkbox" className="h-5 w-5 accent-[hsl(var(--primary))]" checked={d.includeExamples} onChange={(e) => d.setIncludeExamples(e.target.checked)} />
            Modo demonstração: locais, serviços e eventos fictícios. Fotos ilustrativas.
          </label>
          <button type="button" onClick={d.showAllExamples} className="mb-1 min-h-11 rounded-lg px-2 text-xs font-bold text-primary hover:bg-primary/10">
            Ver prévia completa
          </button>
        </div>
      )}

      <div aria-live="polite" className="sr-only">{d.results.length} resultados</div>

      {showList ? (
        <section aria-labelledby="seek-list-title" className="px-3 pt-2 md:px-0">
          <div className="mb-3 flex items-center gap-2">
            {state.list && (
              <button type="button" onClick={() => setState({ list: false, query: "" })} aria-label="Voltar para descobertas"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border hover:border-primary/50 hover:text-primary">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 id="seek-list-title" className="text-base font-extrabold">
              {listItems.length} {listItems.length === 1 ? "resultado" : "resultados"}
              {state.query.trim() && <span className="font-semibold text-muted-foreground"> para “{state.query.trim()}”</span>}
            </h2>
          </div>
          {listItems.length ? (
            <ul className="grid gap-3 lg:grid-cols-2">
              {listItems.map((it) => <li key={it.id}>{card(it, "list")}</li>)}
            </ul>
          ) : (
            <Empty hasFilters={activeFilters > 0 || !!state.query} onClear={d.clearFilters} examples={d.examplesAvailable && !d.includeExamples} />
          )}
        </section>
      ) : d.results.length === 0 ? (
        <div className="px-3 pt-2 md:px-0">
          <Empty hasFilters={activeFilters > 0} onClear={d.clearFilters} examples={d.examplesAvailable && !d.includeExamples} />
        </div>
      ) : (
        <>
          {showRail("providers") && rail("seek-providers", "Prestadores de serviços", "Profissionais com perfil Social", providers, "providers")}
          {showRail("places") && rail("seek-places", "Lugares", "Perfis comerciais da rede", places, "places")}
          {showRail("events") && rail("seek-events", "Eventos", "Com data e local informados", events, "events")}
        </>
      )}
    </>
  );

  return (
    <div className="min-h-[100dvh] pb-24 md:pb-10">
      <div className="mx-auto max-w-6xl md:px-4">
        {/* Location + search */}
        <div className="px-3 pt-3 md:px-0">
          <button type="button" onClick={() => d.setLocationOpen(true)} aria-haspopup="dialog"
            aria-label={`Localização de exploração: ${d.location?.label ?? "nenhuma selecionada"}. Alterar`}
            className="group flex min-h-11 items-center gap-2 rounded-xl pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary"><MapPin className="h-4 w-4" /></span>
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Você está explorando</span>
              <span className="flex items-center gap-1 text-base font-extrabold text-foreground group-hover:text-primary">
                {d.location ? (d.location.city ? `${d.location.city}, ${d.location.state}` : d.location.label) : "Escolher localização"}
                <ChevronDown className="h-4 w-4 text-primary" aria-hidden />
              </span>
            </span>
          </button>
          {d.locationNotice && (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{d.locationNotice}</p>
          )}

          <form role="search" onSubmit={(e) => { e.preventDefault(); setState({ list: true }); }} className="mt-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <label htmlFor="seek-query" className="sr-only">Buscar lugares, serviços e eventos</label>
              <input id="seek-query" type="search" value={state.query} onChange={(e) => setState({ query: e.target.value })}
                placeholder="Pedreiro, café, feira..." enterKeyHint="search"
                className="h-12 w-full rounded-full border border-border bg-muted/60 pl-10 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary/40" />
              {state.query && (
                <button type="button" onClick={() => setState({ query: "" })} aria-label="Limpar busca"
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button type="button" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} aria-controls="seek-filters"
              aria-label={activeFilters ? `Filtros: ${activeFilters} ativos` : "Filtros"}
              className={`relative flex h-12 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-colors ${
                showFilters || activeFilters ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
              <SlidersHorizontal className="h-4 w-4" /><span className="hidden sm:inline">Filtros</span>
              {activeFilters > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] text-primary-foreground">{activeFilters}<span className="sr-only"> filtros ativos</span></span>}
            </button>
          </form>
          <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">Busca por palavras exatas em nome, categoria e descrição. Sem distâncias: ainda não há suporte geográfico.</p>
        </div>

        {d.offline && (
          <p role="status" className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground md:mx-0">
            <WifiOff className="h-4 w-4 text-primary" /> Sem conexão. Mostrando o que já estava carregado; pode estar desatualizado.
          </p>
        )}

        {/* Tabs */}
        <div role="tablist" aria-label="Tipo de descoberta" className="mt-3 flex gap-1 overflow-x-auto border-b border-border px-3 md:px-0 [scrollbar-width:none]">
          {TABS.map((t, index) => (
            <button key={t.key} id={`seek-tab-${t.key}`} aria-controls={`seek-panel-${t.key}`} role="tab" type="button" aria-selected={state.tab === t.key}
              tabIndex={state.tab === t.key ? 0 : -1}
              onKeyDown={(event) => handleTabKeyDown(event, index, TABS.length, (nextIndex) => setState({ tab: TABS[nextIndex].key }))}
              onClick={() => setState({ tab: t.key })}
              className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-bold transition-colors ${
                state.tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {TABS.map((tab) => (
          <div key={tab.key} id={`seek-panel-${tab.key}`} role="tabpanel" aria-labelledby={`seek-tab-${tab.key}`}
            hidden={state.tab !== tab.key} tabIndex={0}>
            {state.tab === tab.key && panelContent}
          </div>
        ))}
      </div>

      <DiscoveryLocationDialog open={d.locationOpen} onOpenChange={d.setLocationOpen} current={d.location} onSelect={d.selectLocation} offline={d.offline} />
      <BusinessReviewsDialog business={d.reviewBusiness} open={!!d.reviewBusiness} onOpenChange={(o) => { if (!o) d.closeReviews(); }} />
    </div>
  );
}

function Empty({ hasFilters, onClear, examples }: { hasFilters: boolean; onClear: () => void; examples: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center">
      <MapPin className="mx-auto mb-3 h-7 w-7 text-primary/70" aria-hidden />
      <p className="text-sm font-bold text-foreground">{hasFilters ? "Nada corresponde a esses critérios" : "Ainda não há perfis ou eventos aqui"}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
        {hasFilters
          ? "A busca usa palavras exatas. Tente outro termo ou remova filtros."
          : "Nenhum perfil comercial ou evento real foi publicado para esta seleção ainda."}
        {examples && " Você também pode ativar os exemplos de demonstração acima."}
      </p>
      {hasFilters && (
        <button type="button" onClick={onClear} className="mt-4 min-h-11 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/90">
          Limpar busca e filtros
        </button>
      )}
    </div>
  );
}
