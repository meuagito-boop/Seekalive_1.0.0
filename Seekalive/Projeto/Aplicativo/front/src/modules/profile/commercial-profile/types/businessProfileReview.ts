export type BusinessReviewRating = 1 | 2 | 3 | 4 | 5;

export type BusinessProfileReviewAuthor = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export interface BusinessProfileReview {
  id: string;
  businessAccountId: string;
  reviewerId: string;
  rating: BusinessReviewRating;
  comment: string;
  createdAt: string;
  businessReply?: {
    content: string;
    createdAt: string;
  };
  reviewer?: BusinessProfileReviewAuthor;
}
