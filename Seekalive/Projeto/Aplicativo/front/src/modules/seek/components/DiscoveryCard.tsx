import { Link } from "wouter";
import { useState } from "react";
import { Bookmark, Calendar, MapPin, Star, Wrench, Store, Ticket } from "lucide-react";
import type { SeekDiscoveryItem } from "@/modules/seek/types/discovery";

const KIND_ICON = { place: Store, provider: Wrench, event: Ticket } as const;
const KIND_LABEL = { place: "Lugar", provider: "Serviço", event: "Evento" } as const;

interface Props {
  item: SeekDiscoveryItem;
  saved: boolean;
  onToggleSave: () => void;
  variant?: "carousel" | "list";
}

export function DiscoveryCard({ item, saved, onToggleSave, variant = "carousel" }: Props) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const hasImage = !!item.image && failedImage !== item.image;
  const Icon = KIND_ICON[item.kind];
  const place = item.cityName ? `${item.cityName}${item.cityState ? `, ${item.cityState}` : ""}` : item.region;
  const list = variant === "list";
  return (
    <article
      className={`group relative flex overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40 focus-within:border-primary/60 ${
        list ? "flex-row" : "h-full flex-col"
      }`}
    >
      <div className={`relative shrink-0 overflow-hidden bg-muted ${list ? "w-28 sm:w-40" : "aspect-[16/10] w-full"}`}>
        {hasImage ? (
          <img src={item.image} alt="" loading="lazy" decoding="async"
            onError={() => setFailedImage(item.image ?? null)}
            className="absolute inset-0 h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 group-hover:scale-[1.03]" />
        ) : item.isExample && item.rating !== undefined ? (
          <p className="flex min-h-11 items-center gap-1 text-xs">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden="true" />
            <span className="font-semibold">{item.rating.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</span>
            <span className="text-muted-foreground">· {item.reviewCount} avaliações de exemplo</span>
          </p>
        ) : null}
        <div className="absolute inset-0 -z-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.22),transparent_60%)]">
          {!hasImage && <Icon className="h-8 w-8 text-primary/70" aria-hidden />}
        </div>
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <span className="rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground backdrop-blur">
            {KIND_LABEL[item.kind]}
          </span>
          {item.isExample && (
            <span className="rounded-full border border-primary/60 bg-background/85 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
              Exemplo
            </span>
          )}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-sm font-bold leading-snug text-foreground">
              <Link href={item.href} className="no-underline after:absolute after:inset-0 focus-visible:outline-none">
                {item.name}
              </Link>
            </h3>
            <p className="truncate text-xs text-muted-foreground">{item.category}</p>
          </div>
          <button type="button" onClick={onToggleSave} aria-pressed={saved}
            aria-label={saved ? `Remover ${item.name} dos salvos` : `Salvar ${item.name}`}
            className="relative z-10 -mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Bookmark className={`h-4 w-4 ${saved ? "fill-primary text-primary" : ""}`} />
          </button>
        </div>

        {item.kind === "event" ? (
          <div className="space-y-1 text-xs text-muted-foreground">
            {item.dateLabel && <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-primary" aria-hidden />{item.dateLabel}</p>}
            {item.priceLabel && <p className="font-semibold text-foreground">{item.free ? "Gratuito" : item.priceLabel}</p>}
          </div>
        ) : item.rating !== undefined ? (
          <div
            aria-label={`Nota ${item.rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}, ${item.reviewCount} avaliações`}
            className="flex min-h-11 w-fit items-center gap-1 px-1 text-xs"
          >
            <Star className="h-3.5 w-3.5 fill-primary text-primary" aria-hidden />
            <span className="font-bold text-foreground">{item.rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
            <span className="text-muted-foreground">({item.reviewCount})</span>
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3 shrink-0" aria-hidden /><span className="truncate">{place || "Região não informada"}</span></span>
          {item.kind === "place" && item.open !== undefined && (
            <span className={item.open ? "font-semibold text-primary" : ""}>
              {item.open ? "Situação informada: aberto" : "Situação informada: fechado"}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
