import type { FormEvent } from "react";
import { Star } from "lucide-react";
import type { BusinessReviewRating } from "../types/businessProfileReview";

type Props = {
  comment: string;
  rating: BusinessReviewRating;
  disabled: boolean;
  onCommentChange: (value: string) => void;
  onRatingChange: (value: BusinessReviewRating) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function BusinessProfileReviewComposer({
  comment,
  rating,
  disabled,
  onCommentChange,
  onRatingChange,
  onSubmit,
}: Props) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-xl border border-border p-4"
    >
      <fieldset>
        <legend className="text-sm font-semibold">Sua nota</legend>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`Dar nota ${value} de 5`}
              aria-pressed={rating === value}
              disabled={disabled}
              onClick={() => onRatingChange(value as BusinessReviewRating)}
              className="flex h-11 w-11 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
            >
              <Star
                aria-hidden="true"
                className={`h-6 w-6 ${
                  value <= rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/40"
                }`}
              />
            </button>
          ))}
        </div>
      </fieldset>

      <label htmlFor="business-profile-review-comment" className="sr-only">
        Conte sua experiência
      </label>
      <textarea
        id="business-profile-review-comment"
        required
        minLength={10}
        maxLength={500}
        rows={4}
        value={comment}
        disabled={disabled}
        onChange={(event) => onCommentChange(event.target.value)}
        placeholder="Conte sua experiência em pelo menos 10 caracteres."
        className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {comment.length}/500 caracteres
        </span>
        <button
          type="submit"
          disabled={disabled || comment.trim().length < 10}
          className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          Publicar avaliação
        </button>
      </div>
    </form>
  );
}
