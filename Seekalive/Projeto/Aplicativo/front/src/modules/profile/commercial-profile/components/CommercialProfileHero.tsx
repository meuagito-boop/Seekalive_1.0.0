import { Camera, Star } from "lucide-react";
import type { User } from "@/modules/profile/types/user";
import { priceLevelLabel } from "@/modules/profile/commercial-profile/utils/priceLevel";

interface CommercialProfileHeroProps {
  user: User;
  photos: string[];
  selectedPhoto: number;
  rating: number | null;
  reviewCount: number;
  onOpenReviews: () => void;
  onShowPhotos: () => void;
}

export function CommercialProfileHero({
  user,
  photos,
  selectedPhoto,
  rating,
  reviewCount,
  onOpenReviews,
  onShowPhotos,
}: CommercialProfileHeroProps) {
  const commercial = user.commercialProfile;
  if (!commercial) return null;

  return (
    <section className="relative h-[250px] overflow-hidden bg-muted md:h-[370px]">
      <img
        src={photos[selectedPhoto] ?? user.coverUrl}
        alt={`Foto de ${user.displayName}`}
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/20" />
      {commercial.isOpen !== undefined && (
        <div className="absolute left-4 top-4">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            commercial.isOpen ? "bg-emerald-500/90 text-white" : "bg-zinc-800/85 text-white"
          }`}>
            {commercial.isOpen ? "Aberto agora" : "Fechado"}
          </span>
        </div>
      )}
      <div className="absolute bottom-4 left-4 right-4 text-white md:bottom-6 md:left-8">
        <p className="mb-1 text-xs font-medium text-white/80">
          {priceLevelLabel(commercial.priceLevel)}
          {commercial.priceLevel && <span className="mx-1.5">·</span>}
          {commercial.category}
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-black leading-tight md:text-4xl">{user.displayName}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span
                className="flex items-center gap-0.5"
                aria-label={rating === null
                  ? "Sem avaliações"
                  : `Nota ${rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 5`}
              >
                {[1, 2, 3, 4, 5].map((score) => (
                  <Star
                    key={score}
                    aria-hidden="true"
                    className={`h-4 w-4 ${
                      rating !== null && score <= Math.round(rating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-white/45"
                    }`}
                  />
                ))}
              </span>
              <button
                type="button"
                onClick={onOpenReviews}
                className="text-sm font-semibold text-white underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {rating === null
                  ? "Sem avaliações"
                  : `${rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · ${reviewCount} ${reviewCount === 1 ? "avaliação" : "avaliações"}`}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onShowPhotos}
            className="flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Camera aria-hidden="true" className="h-4 w-4" />
            {photos.length === 1 ? "Ver 1 foto" : `Ver ${photos.length} fotos`}
          </button>
        </div>
      </div>
    </section>
  );
}
