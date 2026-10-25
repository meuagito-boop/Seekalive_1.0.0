import type { User } from "@/modules/profile/types/user";
import type { SeekReview } from "@/modules/seek/types/review";

export function selectBusinessReviews(
  reviews: SeekReview[],
  businessId: string | undefined,
  getUserById: (accountId: string) => User | undefined,
) {
  const allReviews = businessId
    ? reviews
        .filter((review) => review.businessAccountId === businessId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];
  const visibleReviews = allReviews.filter((review) => !getUserById(review.reviewerId)?.isBlocked);
  return { allReviews, visibleReviews };
}

export function calculateAverageBusinessRating(reviews: SeekReview[]) {
  return reviews.length
    ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
    : 0;
}
