import { useState } from "react";
import { MapPin } from "lucide-react";
import type { DiscoveryLocation } from "@/modules/seek/utils/seekDiscovery";
import { DiscoveryLocationDialog } from "./DiscoveryLocationDialog";

/** Reuses the real city catalogue without mistaking device position for business location. */
export function CommercialDiscoveryCity({ value, onChange }: {
  value: DiscoveryLocation | null;
  onChange: (city: DiscoveryLocation) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Cidade de descoberta no Seek</p>
      <button type="button" onClick={() => setOpen(true)}
        className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-border bg-card px-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        {value ? `${value.city}, ${value.state}` : "Selecionar cidade no catálogo do IBGE"}
      </button>
      <p className="text-xs text-muted-foreground">Usada nos resultados do Seek. Não publica sua posição GPS nem altera o endereço informado.</p>
      <DiscoveryLocationDialog open={open} onOpenChange={setOpen} current={value} onSelect={onChange}
        offline={typeof navigator !== "undefined" && !navigator.onLine} allowDevice={false} />
    </div>
  );
}
