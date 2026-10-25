import type { Dispatch } from "react";
import type { SeekReview, User } from "@/data/mockData";
import { saveStoredSeekReviews } from "@/data/reviewStorage";
import { ContentServiceError } from "@/services/contentService";
import type { SocialAction, SocialState } from "@/context/social/state";

type ReviewActionDependencies = {
  state: SocialState;
  currentUser: User | null;
  dispatch: Dispatch<SocialAction>;
};

export function createSocialReviewActions({ state, currentUser, dispatch }: ReviewActionDependencies) {
  return {
    upsertSeekReview: (review: SeekReview) => {
      const business = state.users.find(
        (user) => user.id === review.businessAccountId && user.accountType === "commercial",
      );
      if (!currentUser || review.reviewerId !== currentUser.id || !business || business.id === currentUser.id) {
        throw new ContentServiceError("Esta conta não pode avaliar este comércio.", 403);
      }
      if (
        !Number.isInteger(review.rating)
        || review.rating < 1
        || review.rating > 5
        || review.comment.trim().length < 10
      ) {
        throw new ContentServiceError("Escolha uma nota de 1 a 5 e escreva pelo menos 10 caracteres.", 422);
      }

      const existing = state.reviews.find(
        (saved) =>
          saved.businessAccountId === review.businessAccountId
          && saved.reviewerId === review.reviewerId,
      );
      const normalizedReview = existing
        ? { ...review, id: existing.id, businessReply: existing.businessReply }
        : review;
      const nextReviews = existing
        ? state.reviews.map((saved) => saved.id === existing.id ? normalizedReview : saved)
        : [...state.reviews, normalizedReview];
      saveStoredSeekReviews(nextReviews);
      dispatch({ type: "UPSERT_SEEK_REVIEW", review: normalizedReview });
    },
    replyToSeekReview: (reviewId: string, businessAccountId: string, content: string) => {
      if (
        !currentUser
        || currentUser.id !== businessAccountId
        || currentUser.accountType !== "commercial"
      ) {
        throw new ContentServiceError("Somente o comércio pode responder à avaliação.", 403);
      }
      if (!state.reviews.some(
        (review) => review.id === reviewId && review.businessAccountId === businessAccountId,
      )) {
        throw new ContentServiceError("Avaliação não encontrada.", 404);
      }
      if (content.trim().length < 3) {
        throw new ContentServiceError("Escreva uma resposta com pelo menos 3 caracteres.", 422);
      }

      const nextReviews = state.reviews.map((review) =>
        review.id !== reviewId || review.businessAccountId !== businessAccountId
          ? review
          : { ...review, businessReply: { content, createdAt: new Date().toISOString() } },
      );
      saveStoredSeekReviews(nextReviews);
      dispatch({ type: "REPLY_TO_SEEK_REVIEW", reviewId, businessAccountId, content });
    },
  };
}
