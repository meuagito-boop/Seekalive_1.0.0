import type { SocialAction, SocialState } from "@/modules/app/state/socialState";

export function reduceSeekReviews(state: SocialState, action: SocialAction): SocialState | null {
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
    default:
      return null;
  }
}
