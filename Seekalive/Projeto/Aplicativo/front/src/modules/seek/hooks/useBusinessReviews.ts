import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAppContext } from "@/modules/app/state/AppContext";
import { useSocial } from "@/modules/app/state/SocialContext";
import type { User } from "@/modules/profile/types/user";
import type { SeekReview } from "@/modules/seek/types/review";
import {
  calculateAverageBusinessRating,
  selectBusinessReviews,
} from "@/modules/seek/utils/businessReviews";

export function useBusinessReviews(business: User | null, open: boolean) {
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

  const { allReviews, visibleReviews } = selectBusinessReviews(
    reviews,
    business?.id,
    getUserById,
  );
  const myReview = allReviews.find((review) => review.reviewerId === currentUser?.id);
  const isOwner = Boolean(
    business
      && currentUser?.id === business.id
      && currentUser.accountType === "commercial",
  );
  const averageRating = calculateAverageBusinessRating(allReviews);

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
      setNotice(error instanceof Error
        ? error.message
        : "Não foi possível salvar. Sua avaliação foi mantida no formulário.");
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
      setNotice(error instanceof Error
        ? error.message
        : "Não foi possível salvar. Sua resposta foi mantida.");
    }
  }

  function getReviewer(review: SeekReview) {
    return review.reviewerId === currentUser?.id
      ? currentUser
      : getUserById(review.reviewerId);
  }

  function setReplyDraft(reviewId: string, value: string) {
    setReplyDrafts((drafts) => ({ ...drafts, [reviewId]: value.slice(0, 500) }));
  }

  return {
    currentUser,
    allReviews,
    visibleReviews,
    myReview,
    isOwner,
    averageRating,
    rating,
    setRating,
    comment,
    setComment: (value: string) => setComment(value.slice(0, 500)),
    replyDrafts,
    setReplyDraft,
    notice,
    submitReview,
    submitReply,
    getReviewer,
  };
}
