import { Link } from "wouter";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { User } from "@/modules/profile/types/user";
import type { SeekReview } from "@/modules/seek/types/review";

type RatingCount = {
  score: number;
  count: number;
};

type CommercialProfileReviewsProps = {
  allReviews: SeekReview[];
  business: User;
  getUserById: (id: string) => User | undefined;
  onWriteReview: () => void;
  rating: number | null;
  ratingCounts: RatingCount[];
  reviews: SeekReview[];
  viewer: User | null;
};

export function CommercialProfileReviews({
  allReviews,
  business,
  getUserById,
  onWriteReview,
  rating,
  ratingCounts,
  reviews,
  viewer,
}: CommercialProfileReviewsProps) {
  return (
    <section className="max-w-3xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Avaliações de clientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Opiniões publicadas por contas do Seekalive.
          </p>
        </div>
        <Button onClick={onWriteReview} className="rounded-full">
          <Star className="mr-2 h-4 w-4" />
          Escrever avaliação
        </Button>
      </div>

      <div className="mb-5 grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-[150px_1fr] sm:p-5">
        <div>
          <p className="text-4xl font-black">
            {rating === null
              ? "—"
              : rating.toLocaleString("pt-BR", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
          </p>
          <div className="mt-1 flex gap-0.5">
            {[1, 2, 3, 4, 5].map((score) => (
              <Star
                key={score}
                className={`h-4 w-4 ${
                  rating !== null && score <= Math.round(rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {allReviews.length} avaliações
          </p>
        </div>
        <div className="space-y-2">
          {ratingCounts.map(({ score, count }) => (
            <div key={score} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-muted-foreground">{score}</span>
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{
                    width: `${
                      allReviews.length ? (count / allReviews.length) * 100 : 0
                    }%`,
                  }}
                />
              </div>
              <span className="w-5 text-right text-muted-foreground">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {reviews.length ? (
        reviews.map((review) => (
          <ReviewEntry
            key={review.id}
            review={review}
            viewer={viewer}
            business={business}
            getUserById={getUserById}
          />
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
          <p className="font-semibold">
            {allReviews.length
              ? "Nenhuma avaliação visível"
              : "Ainda não há avaliações"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {allReviews.length
              ? "Algumas avaliações não estão disponíveis para esta conta."
              : "Compartilhe sua experiência para ajudar outras pessoas."}
          </p>
        </div>
      )}
    </section>
  );
}

function ReviewEntry({
  review,
  viewer,
  business,
  getUserById,
}: {
  review: SeekReview;
  viewer: User | null;
  business: User;
  getUserById: (id: string) => User | undefined;
}) {
  const reviewer =
    review.reviewerId === viewer?.id ? viewer : getUserById(review.reviewerId);

  return (
    <article className="border-b border-border py-4 last:border-0">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={reviewer?.avatarUrl} alt="" />
          <AvatarFallback>{reviewer?.displayName?.[0] ?? "S"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {reviewer ? (
              <Link
                href={`/profile/${reviewer.username}`}
                className="text-sm font-semibold text-foreground no-underline hover:text-primary"
              >
                {reviewer.displayName}
              </Link>
            ) : (
              <span className="text-sm font-semibold text-foreground">
                Conta Social
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <div
            className="mt-1 flex items-center gap-0.5"
            aria-label={`Nota ${review.rating} de 5`}
          >
            {Array.from({ length: review.rating }, (_, index) => (
              <Star
                key={index}
                className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400"
              />
            ))}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {review.comment}
          </p>
          {review.businessReply && (
            <div className="mt-3 rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-semibold text-foreground">
                Resposta de {business.displayName}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {review.businessReply.content}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
