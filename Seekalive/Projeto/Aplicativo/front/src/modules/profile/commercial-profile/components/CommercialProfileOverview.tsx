import { Bookmark, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User } from "@/modules/profile/types/user";
import { businessMapUrl } from "@/modules/profile/commercial-profile/utils/businessMapUrl";
import { priceLevelLabel } from "@/modules/profile/commercial-profile/utils/priceLevel";

interface CommercialProfileOverviewProps {
  user: User;
  openingHoursSummary: string;
  isSaved: boolean;
  onOpenReviews: () => void;
  onToggleSaved: () => void;
}

export function CommercialProfileOverview({
  user,
  openingHoursSummary,
  isSaved,
  onOpenReviews,
  onToggleSaved,
}: CommercialProfileOverviewProps) {
  const commercial = user.commercialProfile;
  if (!commercial) return null;
  return (
    <section className="border-b border-border px-4 py-4 md:px-8">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-semibold">{commercial.category}</span>
        {commercial.priceLevel && (
          <span className="text-muted-foreground">· {priceLevelLabel(commercial.priceLevel)}</span>
        )}
        <span className="min-w-0 break-words text-muted-foreground">· {commercial.address}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
        {commercial.isOpen !== undefined && (
          <span className={`font-semibold ${commercial.isOpen ? "text-emerald-500" : "text-muted-foreground"}`}>
            {commercial.isOpen ? "Aberto" : "Fechado"}
          </span>
        )}
        <span className="text-muted-foreground">{openingHoursSummary}</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 pb-1">
        <Button type="button" onClick={onOpenReviews} className="h-10 shrink-0 rounded-full px-4">
          <Star aria-hidden="true" className="mr-2 h-4 w-4" />
          Adicionar avaliação
        </Button>
        <a
          href={businessMapUrl(commercial.address)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Ver ${user.displayName} no mapa`}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-muted/40 px-4 text-sm font-semibold text-foreground no-underline hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MapPin aria-hidden="true" className="h-4 w-4" />
          Mapa
        </a>
        <button
          type="button"
          onClick={onToggleSaved}
          aria-pressed={isSaved}
          aria-label={isSaved ? "Remover comércio dos salvos" : "Salvar comércio"}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-muted/40 px-4 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bookmark aria-hidden="true" className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
          {isSaved ? "Salvo neste navegador" : "Salvar"}
        </button>
      </div>
    </section>
  );
}
