import { Link } from "wouter";
import { Star } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/modules/profile/types/user";
import type { SeekReview } from "@/modules/seek/types/review";

interface CommercialReviewEntryProps {
  review: SeekReview;
  viewer: User | null;
  business: User;
  getUserById: (id: string) => User | undefined;
}

export function CommercialReviewEntry({ review, viewer, business, getUserById }: CommercialReviewEntryProps) {
  const reviewer = review.reviewerId === viewer?.id ? viewer : getUserById(review.reviewerId);

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
              <span className="text-sm font-semibold text-foreground">Conta Social</span>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-0.5" aria-label={`Nota ${review.rating} de 5`}>
            {Array.from({ length: review.rating }, (_, index) => (
              <Star key={index} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{review.comment}</p>
          {review.businessReply && (
            <div className="mt-3 rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-semibold text-foreground">Resposta de {business.displayName}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{review.businessReply.content}</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
