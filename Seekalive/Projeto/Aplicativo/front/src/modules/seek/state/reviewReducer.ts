import type { SeekReview } from "@/modules/seek/types/review";

export interface SeekReviewState {
  reviews: SeekReview[];
}

export type SeekReviewAction =
  | { type: "UPSERT_SEEK_REVIEW"; review: SeekReview }
  | { type: "REPLY_TO_SEEK_REVIEW"; reviewId: string; businessAccountId: string; content: string };

export function seekReviewReducer(state: SeekReviewState, action: SeekReviewAction): SeekReviewState {
  switch (action.type) {
    case "UPSERT_SEEK_REVIEW": {
      const existing = state.reviews.find(
        (review) =>
          review.businessAccountId === action.review.businessAccountId
          && review.reviewerId === action.review.reviewerId,
      );
      if (!existing) return { ...state, reviews: [...state.reviews, action.review] };
      return {
        ...state,
        reviews: state.reviews.map((review) =>
          review.id === existing.id
            ? { ...action.review, id: existing.id, businessReply: existing.businessReply }
            : review,
        ),
      };
    }
    case "REPLY_TO_SEEK_REVIEW":
      return {
        ...state,
        reviews: state.reviews.map((review) =>
          review.id !== action.reviewId || review.businessAccountId !== action.businessAccountId
            ? review
            : {
                ...review,
                businessReply: { content: action.content, createdAt: new Date().toISOString() },
              },
        ),
      };
  }
}
