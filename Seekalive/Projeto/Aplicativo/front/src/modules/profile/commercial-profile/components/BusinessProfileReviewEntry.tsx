import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "wouter";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/modules/profile/types/user";
import type { BusinessProfileReview } from "../types/businessProfileReview";

type Props = {
  business: User;
  currentUser: User | null;
  review: BusinessProfileReview;
  localReviewer?: User;
  saving: boolean;
  onReply: (reviewId: string, content: string) => Promise<void>;
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
}

export function BusinessProfileReviewEntry({
  business,
  currentUser,
  review,
  localReviewer,
  saving,
  onReply,
}: Props) {
  const [replyDraft, setReplyDraft] = useState(
    review.businessReply?.content ?? "",
  );
  const [notice, setNotice] = useState("");
  const isOwner =
    currentUser?.id === business.id && currentUser.accountType === "commercial";
  const reviewer =
    review.reviewer ??
    (localReviewer
      ? {
          id: localReviewer.id,
          username: localReviewer.username,
          displayName: localReviewer.displayName,
          avatarUrl: localReviewer.avatarUrl || null,
        }
      : undefined);

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = replyDraft.trim();
    if (content.length < 3 || content.length > 500) {
      setNotice("A resposta precisa ter entre 3 e 500 caracteres.");
      return;
    }
    try {
      await onReply(review.id, content);
      setNotice("Resposta publicada.");
    } catch {
      setNotice("Não foi possível publicar a resposta. Tente novamente.");
    }
  }

  return (
    <article className="rounded-xl border border-border p-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={reviewer?.avatarUrl ?? undefined} alt="" />
          <AvatarFallback>{reviewer?.displayName?.[0] ?? "S"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {reviewer ? (
                <Link
                  href={`/profile/${encodeURIComponent(reviewer.username)}`}
                  className="text-sm font-semibold text-foreground no-underline hover:text-primary"
                >
                  {reviewer.displayName}
                </Link>
              ) : (
                <span className="text-sm font-semibold">Conta Social</span>
              )}
              <span className="text-xs text-muted-foreground">
                · {formatDate(review.createdAt)}
              </span>
            </div>
            <div
              className="flex items-center gap-0.5"
              aria-label={`Nota ${review.rating} de 5`}
            >
              {Array.from({ length: review.rating }, (_, index) => (
                <Star
                  key={index}
                  aria-hidden="true"
                  className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
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
                  · {formatDate(review.businessReply.createdAt)}
                </span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {review.businessReply.content}
              </p>
            </div>
          )}

          {isOwner && (
            <form onSubmit={submitReply} className="mt-3 space-y-2">
              <label
                htmlFor={`business-review-reply-${review.id}`}
                className="text-xs font-semibold"
              >
                {review.businessReply
                  ? "Editar resposta"
                  : "Responder avaliação"}
              </label>
              <textarea
                id={`business-review-reply-${review.id}`}
                minLength={3}
                maxLength={500}
                rows={2}
                value={replyDraft}
                disabled={saving}
                onChange={(event) => setReplyDraft(event.target.value)}
                className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className="text-xs text-muted-foreground"
                  aria-live="polite"
                >
                  {notice}
                </span>
                <button
                  type="submit"
                  disabled={saving || replyDraft.trim().length < 3}
                  className="min-h-11 rounded-full border border-border px-4 text-xs font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
                >
                  {review.businessReply
                    ? "Salvar resposta"
                    : "Publicar resposta"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
