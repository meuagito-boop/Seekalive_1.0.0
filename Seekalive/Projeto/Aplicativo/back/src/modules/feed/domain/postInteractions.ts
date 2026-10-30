export interface PostInteractionSummary {
  likes: number;
  comments: number;
  reposts: number;
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked: boolean;
}

export const EMPTY_POST_INTERACTION_SUMMARY: PostInteractionSummary = {
  likes: 0,
  comments: 0,
  reposts: 0,
  isLiked: false,
  isReposted: false,
  isBookmarked: false,
};

export interface FeedCommentAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface FeedComment {
  id: string;
  postId: string;
  authorId: string;
  clientMutationId: string;
  replyToCommentId: string | null;
  content: string;
  createdAt: Date;
}

export interface FeedCommentView extends Omit<FeedComment, "clientMutationId"> {
  likes: number;
  isLiked: boolean;
  author: FeedCommentAuthor;
}

export interface CommentPosition {
  createdAt: Date;
  id: string;
}

export class FeedCommentIdempotencyConflict extends Error {
  constructor() {
    super("A client mutation key was reused for different comment content.");
    this.name = "FeedCommentIdempotencyConflict";
  }
}
