import type { Dispatch } from "react";
import type { User } from "@/modules/profile/types/user";
import type { BusinessProfileReview } from "../types/businessProfileReview";
import {
  saveStoredBusinessProfileReviews,
} from "../data/businessProfileReviewStorage";
import type {
  BusinessProfileReviewAction,
} from "../state/businessProfileReviewReducer";

type Dependencies = {
  state: { users: User[]; reviews: BusinessProfileReview[] };
  currentUser: User | null;
  dispatch: Dispatch<BusinessProfileReviewAction>;
};

export function createBusinessProfileReviewActions({
  state,
  currentUser,
  dispatch,
}: Dependencies) {
  function persist(reviews: BusinessProfileReview[]) {
    saveStoredBusinessProfileReviews(reviews);
  }

  return {
    publishBusinessProfileReview(review: BusinessProfileReview) {
      if (
        !currentUser ||
        currentUser.accountType !== "personal" ||
        review.reviewerId !== currentUser.id ||
        review.businessAccountId === currentUser.id
      ) {
        throw new Error("Esta conta não pode publicar esta avaliação.");
      }
      if (
        state.reviews.some(
          (saved) =>
            saved.businessAccountId === review.businessAccountId &&
            saved.reviewerId === currentUser.id,
        )
      ) {
        throw new Error(
          "Esta conta já avaliou este perfil. Exclua a avaliação anterior antes de publicar outra.",
        );
      }
      const business = state.users.find(
        (user) =>
          user.id === review.businessAccountId &&
          user.accountType === "commercial",
      );
      if (!business) throw new Error("Perfil comercial não encontrado.");
      const normalizedReview = {
        ...review,
        comment: review.comment.trim(),
      };
      if (
        !Number.isInteger(normalizedReview.rating) ||
        normalizedReview.rating < 1 ||
        normalizedReview.rating > 5 ||
        normalizedReview.comment.length < 10 ||
        normalizedReview.comment.length > 500
      ) {
        throw new Error("Confira a nota e o tamanho do comentário.");
      }
      const next = [...state.reviews, normalizedReview];
      persist(next);
      dispatch({
        type: "PUBLISH_BUSINESS_PROFILE_REVIEW",
        review: normalizedReview,
      });
    },

    deleteBusinessProfileReview(businessAccountId: string) {
      if (!currentUser) throw new Error("Entre na conta para continuar.");
      const exists = state.reviews.some(
        (review) =>
          review.businessAccountId === businessAccountId &&
          review.reviewerId === currentUser.id,
      );
      if (!exists) throw new Error("Sua avaliação não está disponível.");
      const next = state.reviews.filter(
        (review) =>
          review.businessAccountId !== businessAccountId ||
          review.reviewerId !== currentUser.id,
      );
      persist(next);
      dispatch({
        type: "DELETE_BUSINESS_PROFILE_REVIEW",
        businessAccountId,
        reviewerId: currentUser.id,
      });
    },

    replyToBusinessProfileReview(
      reviewId: string,
      businessAccountId: string,
      content: string,
    ) {
      const trimmedContent = content.trim();
      if (
        !currentUser ||
        currentUser.id !== businessAccountId ||
        currentUser.accountType !== "commercial"
      ) {
        throw new Error("Somente o comércio pode responder às avaliações.");
      }
      if (
        trimmedContent.length < 3 ||
        trimmedContent.length > 500 ||
        !state.reviews.some(
          (review) =>
            review.id === reviewId &&
            review.businessAccountId === businessAccountId,
        )
      ) {
        throw new Error("Confira a resposta e tente novamente.");
      }
      const next = state.reviews.map((review) =>
        review.id !== reviewId
          ? review
          : {
              ...review,
              businessReply: {
                content: trimmedContent,
                createdAt: new Date().toISOString(),
              },
            },
      );
      persist(next);
      dispatch({
        type: "REPLY_TO_BUSINESS_PROFILE_REVIEW",
        reviewId,
        businessAccountId,
        content: trimmedContent,
      });
    },
  };
}
