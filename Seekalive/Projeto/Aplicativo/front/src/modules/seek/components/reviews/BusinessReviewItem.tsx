import type { FormEvent } from "react";
import { Link } from "wouter";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/modules/profile/types/user";
import type { SeekReview } from "@/modules/seek/types/review";

interface BusinessReviewItemProps {
  review: SeekReview;
  reviewer: User | undefined;
  business: User;
  isOwner: boolean;
  replyDraft: string;
  onReplyDraftChange: (reviewId: string, value: string) => void;
  onSubmitReply: (event: FormEvent<HTMLFormElement>, reviewId: string) => void;
}

function formatReviewDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function BusinessReviewItem({
  review,
  reviewer,
  business,
  isOwner,
  replyDraft,
  onReplyDraftChange,
  onSubmitReply,
}: BusinessReviewItemProps) {
  return (
    <article className="rounded-xl border border-border p-4">
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
                  className="text-sm font-semibold text-foreground no-underline hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                <Star
                  key={index}
                  aria-hidden="true"
                  className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400"
                />
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
              onSubmit={(event) => onSubmitReply(event, review.id)}
              className="mt-3 flex flex-col gap-2 sm:flex-row"
            >
              <label className="sr-only" htmlFor={`reply-${review.id}`}>Resposta do comércio</label>
              <textarea
                id={`reply-${review.id}`}
                value={replyDraft}
                onChange={(event) => onReplyDraftChange(review.id, event.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Responder como comércio..."
                className="min-h-10 flex-1 resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="submit"
                className="self-end rounded-full border border-border px-3 py-2 text-xs font-semibold hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {review.businessReply ? "Salvar resposta" : "Responder"}
              </button>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
