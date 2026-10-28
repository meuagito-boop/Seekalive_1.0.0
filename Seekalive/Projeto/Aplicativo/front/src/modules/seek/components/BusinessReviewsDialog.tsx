import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { MessageSquareText, Star } from "lucide-react";
import { useAppContext } from "@/modules/app/state/AppContext";
import { useSocial } from "@/modules/app/state/SocialApplicationContext";
import type { User } from "@/modules/profile/types/user";
import { BusinessReviewComposer } from "@/modules/seek/components/BusinessReviewComposer";
import { BusinessReviewEntry } from "@/modules/seek/components/BusinessReviewEntry";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
          <BusinessReviewComposer
            currentUser={currentUser}
            myReview={myReview}
            rating={rating}
            comment={comment}
            onRatingChange={setRating}
            onCommentChange={setComment}
            onSubmit={submitReview}
          />
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
                <BusinessReviewEntry
                  key={review.id}
                  business={business}
                  review={review}
                  reviewer={reviewer}
                  isOwner={isOwner}
                  replyDraft={
                    replyDrafts[review.id] ?? review.businessReply?.content ?? ""
                  }
                  onReplyDraftChange={(value) =>
                    setReplyDrafts((drafts) => ({
                      ...drafts,
                      [review.id]: value,
                    }))
                  }
                  onSubmitReply={(event) => submitReply(event, review.id)}
                />
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
