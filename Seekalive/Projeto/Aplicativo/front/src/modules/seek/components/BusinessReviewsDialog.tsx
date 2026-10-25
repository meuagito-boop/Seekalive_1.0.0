import { MessageSquareText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { User } from "@/modules/profile/types/user";
import { BusinessReviewForm } from "@/modules/seek/components/reviews/BusinessReviewForm";
import { BusinessReviewItem } from "@/modules/seek/components/reviews/BusinessReviewItem";
import { BusinessReviewSummary } from "@/modules/seek/components/reviews/BusinessReviewSummary";
import { useBusinessReviews } from "@/modules/seek/hooks/useBusinessReviews";

interface BusinessReviewsDialogProps {
  business: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BusinessReviewsDialog({
  business,
  open,
  onOpenChange,
}: BusinessReviewsDialogProps) {
  const review = useBusinessReviews(business, open);
  if (!business) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle>Avaliações de {business.displayName}</DialogTitle>
          <DialogDescription>
            Publicadas por contas Social. Cada conta pode manter uma avaliação por comércio.
          </DialogDescription>
        </DialogHeader>

        <BusinessReviewSummary
          averageRating={review.averageRating}
          count={review.allReviews.length}
        />

        {!review.isOwner && review.currentUser && (
          <BusinessReviewForm
            currentUser={review.currentUser}
            review={review.myReview}
            rating={review.rating}
            comment={review.comment}
            onRatingChange={review.setRating}
            onCommentChange={review.setComment}
            onSubmit={review.submitReview}
          />
        )}

        {review.isOwner && (
          <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            Você está usando a conta deste comércio. Responda às avaliações abaixo; não é possível avaliar o próprio perfil.
          </p>
        )}

        {review.notice && (
          <p role="status" className="text-sm text-primary">{review.notice}</p>
        )}

        <div className="space-y-3">
          {review.visibleReviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <MessageSquareText aria-hidden="true" className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">
                {review.allReviews.length ? "Nenhuma avaliação visível" : "Ainda não há avaliações"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {review.allReviews.length
                  ? "Algumas avaliações não estão disponíveis para esta conta."
                  : "Seja a primeira pessoa a compartilhar uma experiência."}
              </p>
            </div>
          ) : (
            review.visibleReviews.map((item) => (
              <BusinessReviewItem
                key={item.id}
                review={item}
                reviewer={review.getReviewer(item)}
                business={business}
                isOwner={review.isOwner}
                replyDraft={review.replyDrafts[item.id] ?? item.businessReply?.content ?? ""}
                onReplyDraftChange={review.setReplyDraft}
                onSubmitReply={review.submitReply}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
