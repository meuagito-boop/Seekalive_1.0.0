import { useState } from "react";
import type { FormEvent } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { User } from "@/modules/profile/types/user";
import { BusinessProfileReviewComposer } from "./BusinessProfileReviewComposer";
import { BusinessProfileReviewEntry } from "./BusinessProfileReviewEntry";
import type {
  BusinessProfileReview,
  BusinessReviewRating,
} from "../types/businessProfileReview";

type Props = {
  business: User;
  currentUser: User | null;
  getUserById: (id: string) => User | undefined;
  reviews: BusinessProfileReview[];
  summary: {
    averageRating: number | null;
    total: number;
    distribution: Array<{ rating: BusinessReviewRating; count: number }>;
  };
  viewerReviewId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => Promise<void>;
  onRetry: () => Promise<void>;
  onCreate: (input: {
    rating: BusinessReviewRating;
    comment: string;
  }) => Promise<void>;
  onDelete: () => Promise<void>;
  onReply: (reviewId: string, content: string) => Promise<void>;
};

export function CommercialProfileReviewsPanel({
  business,
  currentUser,
  getUserById,
  reviews,
  summary,
  viewerReviewId,
  isLoading,
  isSaving,
  error,
  hasMore,
  onLoadMore,
  onRetry,
  onCreate,
  onDelete,
  onReply,
}: Props) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [rating, setRating] = useState<BusinessReviewRating>(5);
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");
  const isOwner =
    currentUser?.id === business.id && currentUser.accountType === "commercial";
  const isPersonalViewer = currentUser?.accountType === "personal";
  const canReview = isPersonalViewer && !isOwner;

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedComment = comment.trim();
    if (trimmedComment.length < 10 || trimmedComment.length > 500) {
      setNotice("A avaliação precisa ter entre 10 e 500 caracteres.");
      return;
    }
    try {
      await onCreate({ rating, comment: trimmedComment });
      setComment("");
      setComposerOpen(false);
      setNotice("Avaliação publicada.");
    } catch {
      setNotice(
        "Não foi possível publicar. Confira a mensagem e tente novamente.",
      );
    }
  }

  async function deleteReview() {
    if (
      !window.confirm(
        "Excluir sua avaliação? Ela poderá ser publicada novamente depois.",
      )
    ) {
      return;
    }
    try {
      await onDelete();
      setNotice("Sua avaliação foi excluída.");
    } catch {
      setNotice("Não foi possível excluir sua avaliação.");
    }
  }

  return (
    <section className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Avaliações de clientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Avaliações publicadas no perfil comercial do Seekalive.
          </p>
        </div>
        {canReview && !viewerReviewId && !composerOpen && (
          <Button
            onClick={() => setComposerOpen(true)}
            className="min-h-11 rounded-full"
          >
            <Star className="mr-2 h-4 w-4" aria-hidden="true" />
            Escrever avaliação
          </Button>
        )}
        {!currentUser && (
          <a
            href="/login"
            className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-sm font-semibold text-foreground no-underline hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Entre para avaliar
          </a>
        )}
      </div>

      <div className="grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-[150px_1fr] sm:p-5">
        <div>
          <p className="text-4xl font-black">
            {summary.averageRating === null
              ? "—"
              : summary.averageRating.toLocaleString("pt-BR", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
          </p>
          <div className="mt-1 flex gap-0.5" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((score) => (
              <Star
                key={score}
                className={`h-4 w-4 ${
                  summary.averageRating !== null &&
                  score <= Math.round(summary.averageRating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.total} {summary.total === 1 ? "avaliação" : "avaliações"}
          </p>
        </div>
        <div className="space-y-2" aria-label="Distribuição das avaliações">
          {[...summary.distribution]
            .reverse()
            .map(({ rating: score, count }) => (
              <div key={score} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-muted-foreground">{score}</span>
                <Star
                  className="h-3 w-3 fill-amber-400 text-amber-400"
                  aria-hidden="true"
                />
                <div
                  className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                  role="img"
                  aria-label={`${count} avaliações com nota ${score}`}
                >
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{
                      width: `${summary.total ? (count / summary.total) * 100 : 0}%`,
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

      {viewerReviewId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
          <p className="text-sm">
            Você já publicou uma avaliação. Para alterar a nota ou o texto,
            exclua-a e publique outra.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => void deleteReview()}
            className="min-h-11 rounded-full"
          >
            Excluir minha avaliação
          </Button>
        </div>
      )}

      {composerOpen && canReview && !viewerReviewId && (
        <BusinessProfileReviewComposer
          comment={comment}
          rating={rating}
          disabled={isSaving}
          onCommentChange={setComment}
          onRatingChange={setRating}
          onSubmit={(event) => void submitReview(event)}
        />
      )}

      {(notice || error) && (
        <p
          className="text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {error ?? notice}
        </p>
      )}
      {error && business.source === "server" && (
        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          onClick={() => void onRetry()}
          className="min-h-11 rounded-full"
        >
          Tentar novamente
        </Button>
      )}

      {isLoading && !reviews.length ? (
        <p
          className="py-8 text-center text-sm text-muted-foreground"
          role="status"
        >
          Carregando avaliações…
        </p>
      ) : reviews.length ? (
        <div className="space-y-3">
          {reviews.map((review) => (
            <BusinessProfileReviewEntry
              key={review.id}
              business={business}
              currentUser={currentUser}
              review={review}
              localReviewer={getUserById(review.reviewerId)}
              saving={isSaving}
              onReply={onReply}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center">
          <p className="font-semibold">Ainda não há avaliações</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Compartilhe sua experiência para ajudar outras pessoas.
          </p>
        </div>
      )}

      {hasMore && (
        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          onClick={() => void onLoadMore()}
          className="min-h-11 w-full rounded-full"
        >
          {isLoading ? "Carregando…" : "Ver mais avaliações"}
        </Button>
      )}
    </section>
  );
}
