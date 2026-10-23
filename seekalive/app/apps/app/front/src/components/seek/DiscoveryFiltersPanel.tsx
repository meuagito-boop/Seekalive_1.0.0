import type { DiscoveryFilters } from "@/lib/seekDiscovery";

interface Props {
  state: DiscoveryFilters;
  setState: (patch: Partial<DiscoveryFilters>) => void;
  clearFilters: () => void;
}

const field = "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none";
const label = "flex flex-col gap-1 text-xs font-semibold text-muted-foreground";

export function DiscoveryFiltersPanel({ state, setState, clearFilters }: Props) {
  const showEvents = state.tab === "events" || state.tab === "explore";
  const showPlaces = state.tab !== "events";
  return (
    <div id="seek-filters" className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className={label}>
        Ordenar por
        <select className={field} value={state.sort} onChange={(e) => setState({ sort: e.target.value as DiscoveryFilters["sort"] })}>
          <option value="relevance">Relevância</option>
          <option value="rating">Melhor avaliação</option>
          <option value="name">Nome (A–Z)</option>
          <option value="date">Data do evento</option>
        </select>
      </label>
      {showPlaces && (
        <label className={label}>
          Nota mínima
          <select className={field} value={state.minimumRating} onChange={(e) => setState({ minimumRating: Number(e.target.value) })}>
            <option value={0}>Qualquer nota</option>
            <option value={3}>3,0 ou mais</option>
            <option value={4}>4,0 ou mais</option>
            <option value={4.5}>4,5 ou mais</option>
          </select>
        </label>
      )}
      {showEvents && (
        <>
          <label className={label}>
            Preço do evento
            <select className={field} value={state.eventPrice} onChange={(e) => setState({ eventPrice: e.target.value as DiscoveryFilters["eventPrice"] })}>
              <option value="all">Todos</option>
              <option value="free">Gratuitos</option>
              <option value="paid">Pagos</option>
            </select>
          </label>
          <label className={label}>
            Período
            <select className={field} value={state.eventPeriod} onChange={(e) => setState({ eventPeriod: e.target.value as DiscoveryFilters["eventPeriod"] })}>
              <option value="all">Qualquer data</option>
              <option value="upcoming">Próximos</option>
              <option value="weekend">Este fim de semana</option>
            </select>
          </label>
        </>
      )}
      <label className={label}>
        Raio de busca
        <select className={field} disabled value="" aria-describedby="seek-radius-note">
          <option value="">Indisponível</option>
        </select>
        <span id="seek-radius-note" className="font-normal">Sem suporte geoespacial: não calculamos distância, então o raio não é aplicado.</span>
      </label>
      {showPlaces && (
        <label className="flex min-h-11 items-center gap-3 self-end text-sm font-semibold text-foreground">
          <input type="checkbox" className="h-5 w-5 accent-[hsl(var(--primary))]" checked={state.onlyOpen}
            onChange={(e) => setState({ onlyOpen: e.target.checked })} />
          <span>Situação informada: aberto<span className="block text-xs font-normal text-muted-foreground">Declarada pelo perfil, não em tempo real.</span></span>
        </label>
      )}
      <div className="flex items-end sm:col-span-2 lg:col-span-4">
        <button type="button" onClick={clearFilters} className="min-h-11 rounded-full px-4 text-sm font-bold text-primary hover:bg-primary/10">
          Limpar filtros
        </button>
      </div>
    </div>
  );
}
