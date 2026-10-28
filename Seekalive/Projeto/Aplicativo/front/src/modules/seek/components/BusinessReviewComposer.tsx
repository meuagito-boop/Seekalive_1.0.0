import type { FormEvent } from "react";
import { Star } from "lucide-react";
import type { User } from "@/modules/profile/types/user";
import type { SeekReview } from "@/modules/seek/types/review";

interface BusinessReviewComposerProps {
  currentUser: User;
  myReview?: SeekReview;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  onRatingChange: (rating: 1 | 2 | 3 | 4 | 5) => void;
  onCommentChange: (comment: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function BusinessReviewComposer({
  currentUser,
  myReview,
  rating,
  comment,
  onRatingChange,
  onCommentChange,
  onSubmit,
}: BusinessReviewComposerProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-xl border border-border p-4"
    >
      <div>
        <p className="text-sm font-semibold">
          {myReview
            ? "Atualize sua avaliação"
            : "Conte como foi sua experiência"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Publicando como @{currentUser.username}
        </p>
      </div>

      <div
        className="flex items-center gap-1"
        aria-label={`Nota selecionada: ${rating} de 5`}
      >
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`Dar nota ${value} de 5`}
            aria-pressed={rating === value}
            onClick={() => onRatingChange(value as 1 | 2 | 3 | 4 | 5)}
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

      <label className="sr-only" htmlFor="seek-review-comment">
        Sua avaliação
      </label>
      <textarea
        id="seek-review-comment"
        value={comment}
        onChange={(event) => onCommentChange(event.target.value.slice(0, 500))}
        minLength={10}
        maxLength={500}
        rows={3}
        placeholder="O que outras pessoas deveriam saber?"
        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          {comment.length}/500
        </span>
        <button
          type="submit"
          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {myReview ? "Salvar alterações" : "Publicar avaliação"}
        </button>
      </div>
    </form>
  );
}
