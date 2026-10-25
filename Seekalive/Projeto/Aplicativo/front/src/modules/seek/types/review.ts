export interface SeekReview {
  id: string;
  businessAccountId: string;
  reviewerId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  createdAt: string;
  businessReply?: {
    content: string;
    createdAt: string;
  };
}
