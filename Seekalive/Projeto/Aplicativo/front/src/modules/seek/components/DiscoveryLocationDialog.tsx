import { useEffect, useRef, useState } from "react";
import { Check, Clock, LocateFixed, Loader2, MapPin, RotateCcw, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppContext } from "@/modules/app/state/AppContext";
import { localActorId } from "@/modules/app/persistence/browserAccountStorage";
import type { DiscoveryLocation } from "@/modules/seek/types/discovery";
import { locationErrorMessage, readRecentLocations, requestDeviceLocation, searchCities } from "@/modules/seek/services/seekLocationService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: DiscoveryLocation | null;
  onSelect: (loc: DiscoveryLocation) => void;
  offline: boolean;
  allowDevice?: boolean;
}

type Status = "idle" | "loading" | "error" | "done";

export function DiscoveryLocationDialog({ open, onOpenChange, current, onSelect, offline, allowDevice = true }: Props) {
  const { currentUser } = useAppContext();
  const accountId = localActorId(currentUser?.id);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiscoveryLocation[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [gpsState, setGpsState] = useState<"idle" | "explain" | "loading" | "error">("idle");
  const [gpsError, setGpsError] = useState("");
  const [recent, setRecent] = useState<DiscoveryLocation[]>([]);
  const gpsAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      gpsAbort.current?.abort();
      setQuery(""); setGpsState("idle"); setGpsError("");
      return;
    }
    try { setRecent(readRecentLocations(accountId)); } catch { setRecent([]); }
  }, [open, accountId]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length === 1) { setResults([]); setStatus("idle"); return; }
    const ctrl = new AbortController();
    setStatus("loading");
    const t = window.setTimeout(() => {
      searchCities(q, ctrl.signal)
        .then((r) => { if (!ctrl.signal.aborted) { setResults(r); setStatus("done"); } })
        .catch((e) => { if (!ctrl.signal.aborted) { setError(locationErrorMessage(e)); setStatus("error"); } });
    }, 300);
    return () => { window.clearTimeout(t); ctrl.abort(); };
  }, [query, open, retry]);

  async function useDevice() {
    gpsAbort.current?.abort();
    const ctrl = new AbortController();
    gpsAbort.current = ctrl;
    setGpsState("loading"); setGpsError("");
    try {
      const loc = await requestDeviceLocation(ctrl.signal);
      if (ctrl.signal.aborted) return;
      onSelect(loc);
      onOpenChange(false);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setGpsError(locationErrorMessage(e));
      setGpsState("error");
    }
  }

  function pick(loc: DiscoveryLocation) { onSelect(loc); onOpenChange(false); }

  const row = (loc: DiscoveryLocation, icon: "pin" | "clock") => {
    const selected = current?.id === loc.id;
    const Icon = icon === "pin" ? MapPin : Clock;
    return (
      <li key={`${icon}-${loc.id}`}>
        <button type="button" onClick={() => pick(loc)} aria-current={selected ? "true" : undefined}
          className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? "bg-primary/10" : ""}`}>
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{loc.city || loc.label}</span>
            {loc.state && <span className="block text-xs text-muted-foreground">{loc.state} · Brasil</span>}
          </span>
          {selected && <><Check className="h-4 w-4 text-primary" aria-hidden /><span className="sr-only">selecionada</span></>}
        </button>
      </li>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] w-[calc(100%-2rem)] max-w-md flex-col gap-3 rounded-2xl">
        <DialogHeader>
          <DialogTitle>Escolher localização</DialogTitle>
          <DialogDescription>
            Atual: {current ? current.label : "nenhuma selecionada"}. Fechar sem escolher mantém a atual.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="seek-city-search" className="sr-only">Pesquisar cidade</label>
          <input id="seek-city-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off"
            placeholder="Pesquisar cidade (mín. 2 letras)"
            className="h-12 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none" />
        </div>

        {allowDevice && <div className="rounded-xl border border-border bg-muted/30 p-3">
          {gpsState === "idle" && (
            <button type="button" onClick={() => setGpsState("explain")} disabled={offline}
              className="flex min-h-11 w-full items-center gap-2 text-sm font-bold text-primary disabled:opacity-50">
              <LocateFixed className="h-4 w-4" aria-hidden /> Usar minha localização atual
            </button>
          )}
          {gpsState === "explain" && (
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>O navegador vai pedir permissão. A posição fica apenas em memória, sem envio a terceiros. Ainda não temos geocodificação nem coordenadas nos cadastros: para encontrar resultados será necessário escolher uma cidade manualmente.</p>
              <div className="flex gap-2">
                <button type="button" onClick={useDevice} className="min-h-11 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground">Continuar</button>
                <button type="button" onClick={() => setGpsState("idle")} className="min-h-11 rounded-full px-4 text-sm font-semibold text-foreground hover:bg-muted">Agora não</button>
              </div>
            </div>
          )}
          {gpsState === "loading" && (
            <p role="status" className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 motion-safe:animate-spin" /> Obtendo localização aproximada...</p>
          )}
          {gpsState === "error" && (
            <div role="alert" className="space-y-2 text-sm">
              <p className="text-foreground">{gpsError}</p>
              <p className="text-xs text-muted-foreground">Você pode escolher uma cidade manualmente acima.</p>
              <button type="button" onClick={useDevice} className="min-h-11 rounded-full px-3 text-sm font-bold text-primary hover:bg-primary/10">Tentar novamente</button>
            </div>
          )}
          {offline && gpsState === "idle" && <p className="text-xs text-muted-foreground">Sem conexão: a pesquisa de cidades pode falhar.</p>}
        </div>}

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1" aria-live="polite">
          {!query.trim() && recent.length > 0 && (
            <>
              <h3 className="mb-1 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recentes nesta sessão</h3>
              <ul className="mb-3">{recent.map((l) => row(l, "clock"))}</ul>
            </>
          )}
          <h3 className="mb-1 px-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {query.trim() ? "Cidades do IBGE" : "Capitais (IBGE)"}
          </h3>
          {status === "loading" && (
            <ul aria-busy="true" className="space-y-2">{[0, 1, 2, 3].map((i) => <li key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}</ul>
          )}
          {status === "idle" && query.trim().length === 1 && <p className="px-1 text-sm text-muted-foreground">Digite pelo menos 2 letras.</p>}
          {status === "error" && (
            <div role="alert" className="space-y-2 px-1 text-sm">
              <p>{error}</p>
              <button type="button" onClick={() => setRetry((n) => n + 1)} className="flex min-h-11 items-center gap-2 rounded-full px-3 font-bold text-primary hover:bg-primary/10">
                <RotateCcw className="h-4 w-4" /> Tentar novamente
              </button>
            </div>
          )}
          {status === "done" && results.length === 0 && (
            <p className="px-1 text-sm text-muted-foreground">Nenhuma cidade encontrada para “{query.trim()}”. Confira a grafia.</p>
          )}
          {status === "done" && results.length > 0 && <ul>{results.map((l) => row(l, "pin"))}</ul>}
        </div>
        <p className="shrink-0 text-[11px] text-muted-foreground">
          Catálogo oficial do IBGE incluído nesta versão · 22/10/2026. Municípios do Brasil; bairros e geocodificação não estão integrados.
        </p>
      </DialogContent>
    </Dialog>
  );
}
