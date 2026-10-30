import type {
  FeedPost,
  FeedPostFormat,
  NewFeedPost,
  PostPosition,
} from "../domain/post";
import type { PostInteractionSummary } from "../domain/postInteractions";
import type {
  CommentPosition,
  FeedComment,
  FeedCommentAuthor,
} from "../domain/postInteractions";
import type { FeedAuthorAccessView } from "./postVisibility";

export type InsertFeedPost = (post: NewFeedPost) => Promise<FeedPost>;
export type FindFeedPost = (postId: string) => Promise<FeedPost | null>;
export type DeleteOwnedFeedPost = (
  postId: string,
  actorId: string,
) => Promise<boolean>;

export type ListFeedPostsByAuthor = (input: {
  authorId: string;
  format: FeedPostFormat | "all";
  after: PostPosition | null;
  limit: number;
}) => Promise<FeedPost[]>;

export type ListFeedPostsForTimeline = (input: {
  authorIds: string[] | null;
  format: FeedPostFormat | "all";
  after: PostPosition | null;
  limit: number;
}) => Promise<FeedPost[]>;

export type ListFeedFollowingIds = (accountId: string) => Promise<string[]>;

export type FindFeedAuthors = (
  authorIds: string[],
  viewerId: string | null,
) => Promise<FeedAuthorAccessView[]>;

export type FindPostInteractionSummaries = (
  postIds: string[],
  viewerId: string | null,
) => Promise<Map<string, PostInteractionSummary>>;

export type FindFeedCommentAuthors = (
  accountIds: string[],
  viewerId: string,
) => Promise<FeedCommentAuthor[]>;
export type ListFeedPostComments = (input: {
  postId: string;
  after: CommentPosition | null;
  limit: number;
}) => Promise<FeedComment[]>;
