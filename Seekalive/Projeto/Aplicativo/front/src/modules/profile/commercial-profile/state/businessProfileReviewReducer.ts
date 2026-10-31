import type { BusinessProfileReview } from "../types/businessProfileReview";

export interface BusinessProfileReviewState {
  reviews: BusinessProfileReview[];
}

export type BusinessProfileReviewAction =
  | {
      type: "PUBLISH_BUSINESS_PROFILE_REVIEW";
      review: BusinessProfileReview;
    }
  | {
      type: "DELETE_BUSINESS_PROFILE_REVIEW";
      businessAccountId: string;
      reviewerId: string;
    }
  | {
      type: "REPLY_TO_BUSINESS_PROFILE_REVIEW";
      reviewId: string;
      businessAccountId: string;
      content: string;
    };

export function businessProfileReviewReducer(
  state: BusinessProfileReviewState,
  action: BusinessProfileReviewAction,
): BusinessProfileReviewState {
  switch (action.type) {
    case "PUBLISH_BUSINESS_PROFILE_REVIEW":
      if (
        state.reviews.some(
          (review) =>
            review.businessAccountId === action.review.businessAccountId &&
            review.reviewerId === action.review.reviewerId,
        )
      ) {
        return state;
      }
      return { ...state, reviews: [...state.reviews, action.review] };
    case "DELETE_BUSINESS_PROFILE_REVIEW":
      return {
        ...state,
        reviews: state.reviews.filter(
          (review) =>
            review.businessAccountId !== action.businessAccountId ||
            review.reviewerId !== action.reviewerId,
        ),
      };
    case "REPLY_TO_BUSINESS_PROFILE_REVIEW":
      return {
        ...state,
        reviews: state.reviews.map((review) =>
          review.id !== action.reviewId ||
          review.businessAccountId !== action.businessAccountId
            ? review
            : {
                ...review,
                businessReply: {
                  content: action.content,
                  createdAt: new Date().toISOString(),
                },
              },
        ),
      };
  }
}
