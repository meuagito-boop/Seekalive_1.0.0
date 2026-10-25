import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "wouter";
import { MessageSquareText, Star } from "lucide-react";
import { useAppContext } from "@/modules/app/state/AppContext";
import { useSocial } from "@/modules/app/state/SocialContext";
import type { User } from "@/modules/profile/types/user";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface BusinessReviewsDialogProps {
  business: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatReviewDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function BusinessReviewsDialog({
  business,
  open,
  onOpenChange,
}: BusinessReviewsDialogProps) {
  const { currentUser } = useAppContext();
  const {
    reviews,
    getUserById,
    upsertSeekReview,
    replyToSeekReview,
  } = useSocial();
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [comment, setComment] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");

  const allBusinessReviews = business
    ? reviews
        .filter((review) => review.businessAccountId === business.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];
  const businessReviews = allBusinessReviews.filter(review => !getUserById(review.reviewerId)?.isBlocked);
  const myReview = business
    ? allBusinessReviews.find((review) => review.reviewerId === currentUser?.id)
    : undefined;
  const isOwner = Boolean(
    business &&
      currentUser?.id === business.id &&
      currentUser.accountType === "commercial",
  );
  const averageRating = allBusinessReviews.length
    ? allBusinessReviews.reduce((total, review) => total + review.rating, 0) / allBusinessReviews.length
    : 0;

  useEffect(() => {
    if (!open) return;
    setRating(myReview?.rating ?? 5);
    setComment(myReview?.comment ?? "");
    setReplyDrafts({});
    setNotice("");
  }, [open, business?.id]);

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!business || !currentUser || isOwner) return;

    const trimmedComment = comment.trim();
    if (trimmedComment.length < 10) {
      setNotice("Escreva pelo menos 10 caracteres na avaliação.");
      return;
    }

    try {
      upsertSeekReview({
      id: myReview?.id ?? `review-${business.id}-${currentUser.id}`,
      businessAccountId: business.id,
      reviewerId: currentUser.id,
      rating,
      comment: trimmedComment,
      createdAt: myReview?.createdAt ?? new Date().toISOString(),
      businessReply: myReview?.businessReply,
      });
      setNotice("Sua avaliação foi salva neste navegador.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível salvar. Sua avaliação foi mantida no formulário.");
    }
  }

  function submitReply(event: FormEvent<HTMLFormElement>, reviewId: string) {
    event.preventDefault();
    if (!business || !isOwner) return;

    const text = (replyDrafts[reviewId] ?? "").trim();
    if (text.length < 3) {
      setNotice("Escreva uma resposta com pelo menos 3 caracteres.");
      return;
    }

    try {
      replyToSeekReview(reviewId, business.id, text);
      setReplyDrafts((drafts) => ({ ...drafts, [reviewId]: text }));
      setNotice("Resposta do comércio salva neste navegador.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível salvar. Sua resposta foi mantida.");
    }
  }

  if (!business) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-h-[88vh] max-w-2xl overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle>Avaliações de {business.displayName}</DialogTitle>
          <DialogDescription>
            Publicadas por contas Social. Cada conta pode manter uma avaliação por comércio.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-3">
          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          <span className="text-lg font-bold">
            {allBusinessReviews.length ? averageRating.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—"}
          </span>
          <span className="text-sm text-muted-foreground">
            {allBusinessReviews.length} {allBusinessReviews.length === 1 ? "avaliação" : "avaliações"}
          </span>
        </div>

        {!isOwner && currentUser && (
          <form onSubmit={submitReview} className="space-y-3 rounded-xl border border-border p-4">
            <div>
              <p className="text-sm font-semibold">
                {myReview ? "Atualize sua avaliação" : "Conte como foi sua experiência"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Publicando como @{currentUser.username}
              </p>
            </div>

            <div className="flex items-center gap-1" aria-label={`Nota selecionada: ${rating} de 5`}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Dar nota ${value} de 5`}
                  aria-pressed={rating === value}
                  onClick={() => setRating(value as 1 | 2 | 3 | 4 | 5)}
                  className="rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      value <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>

            <label className="sr-only" htmlFor="seek-review-comment">Sua avaliação</label>
            <textarea
              id="seek-review-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value.slice(0, 500))}
              minLength={10}
              maxLength={500}
              rows={3}
              placeholder="O que outras pessoas deveriam saber?"
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{comment.length}/500</span>
              <button
                type="submit"
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {myReview ? "Salvar alterações" : "Publicar avaliação"}
              </button>
            </div>
          </form>
        )}

        {isOwner && (
          <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            Você está usando a conta deste comércio. Responda às avaliações abaixo; não é possível avaliar o próprio perfil.
          </p>
        )}

        {notice && (
          <p role="status" className="text-sm text-primary">{notice}</p>
        )}

        <div className="space-y-3">
          {businessReviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <MessageSquareText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">{allBusinessReviews.length ? "Nenhuma avaliação visível" : "Ainda não há avaliações"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {allBusinessReviews.length ? "Algumas avaliações não estão disponíveis para esta conta." : "Seja a primeira pessoa a compartilhar uma experiência."}
              </p>
            </div>
          ) : (
            businessReviews.map((review) => {
              const reviewer = review.reviewerId === currentUser?.id
                ? currentUser
                : getUserById(review.reviewerId);

              return (
                <article key={review.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={reviewer?.avatarUrl} alt="" />
                      <AvatarFallback>{reviewer?.displayName?.[0] ?? "S"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {reviewer ? (
                            <Link
                              href={`/profile/${reviewer.username}`}
                              className="text-sm font-semibold text-foreground no-underline hover:text-primary"
                            >
                              {reviewer.displayName}
                            </Link>
                          ) : (
                            <span className="text-sm font-semibold">Conta Social</span>
                          )}
                          <span className="text-xs text-muted-foreground">· {formatReviewDate(review.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-0.5" aria-label={`Nota ${review.rating} de 5`}>
                          {Array.from({ length: review.rating }, (_, index) => (
                            <Star key={index} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {review.comment}
                      </p>

                      {review.businessReply && (
                        <div className="mt-3 rounded-lg bg-muted/50 p-3">
                          <p className="text-xs font-semibold">
                            Resposta de {business.displayName}
                            <span className="ml-2 font-normal text-muted-foreground">
                              · {formatReviewDate(review.businessReply.createdAt)}
                            </span>
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                            {review.businessReply.content}
                          </p>
                        </div>
                      )}

                      {isOwner && (
                        <form
                          onSubmit={(event) => submitReply(event, review.id)}
                          className="mt-3 flex flex-col gap-2 sm:flex-row"
                        >
                          <label className="sr-only" htmlFor={`reply-${review.id}`}>Resposta do comércio</label>
                          <textarea
                            id={`reply-${review.id}`}
                            value={replyDrafts[review.id] ?? review.businessReply?.content ?? ""}
                            onChange={(event) =>
                              setReplyDrafts((drafts) => ({
                                ...drafts,
                                [review.id]: event.target.value.slice(0, 500),
                              }))
                            }
                            maxLength={500}
                            rows={2}
                            placeholder="Responder como comércio..."
                            className="min-h-10 flex-1 resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                          />
                          <button
                            type="submit"
                            className="self-end rounded-full border border-border px-3 py-2 text-xs font-semibold hover:border-primary/40 hover:text-primary"
                          >
                            {review.businessReply ? "Salvar resposta" : "Responder"}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
