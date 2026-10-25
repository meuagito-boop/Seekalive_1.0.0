import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommercialReviewEntry } from "./CommercialReviewEntry";
import type { User } from "@/modules/profile/types/user";
import type { SeekReview } from "@/modules/seek/types/review";

interface CommercialReviewsTabProps {
  user: User;
  viewer: User | null;
  allReviews: SeekReview[];
  visibleReviews: SeekReview[];
  rating: number | null;
  ratingCounts: Array<{ score: number; count: number }>;
  getUserById: (id: string) => User | undefined;
  onOpenReview: () => void;
}

export function CommercialReviewsTab({
  user,
  viewer,
  allReviews,
  visibleReviews,
  rating,
  ratingCounts,
  getUserById,
  onOpenReview,
}: CommercialReviewsTabProps) {
  return (
    <section className="max-w-3xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Avaliações de clientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">Opiniões publicadas por contas do Seekalive.</p>
        </div>
        <Button onClick={onOpenReview} className="rounded-full">
          <Star className="mr-2 h-4 w-4" />
          Escrever avaliação
        </Button>
      </div>

      <div className="mb-5 grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-[150px_1fr] sm:p-5">
        <div>
          <p className="text-4xl font-black">{rating === null ? "—" : rating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</p>
          <div className="mt-1 flex gap-0.5">
            {[1, 2, 3, 4, 5].map((score) => (
              <Star key={score} className={`h-4 w-4 ${rating !== null && score <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{allReviews.length} avaliações</p>
        </div>
        <div className="space-y-2">
          {ratingCounts.map(({ score, count }) => (
            <div key={score} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-muted-foreground">{score}</span>
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${allReviews.length ? (count / allReviews.length) * 100 : 0}%` }} />
              </div>
              <span className="w-5 text-right text-muted-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {visibleReviews.length ? (
        visibleReviews.map((review) => (
          <CommercialReviewEntry key={review.id} review={review} viewer={viewer} business={user} getUserById={getUserById} />
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
          <p className="font-semibold">{allReviews.length ? "Nenhuma avaliação visível" : "Ainda não há avaliações"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {allReviews.length ? "Algumas avaliações não estão disponíveis para esta conta." : "Compartilhe sua experiência para ajudar outras pessoas."}
          </p>
        </div>
      )}
    </section>
  );
}
