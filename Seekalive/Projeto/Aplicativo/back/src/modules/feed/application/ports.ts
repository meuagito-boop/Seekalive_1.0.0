import type {
  FeedPost,
  FeedPostFormat,
  NewFeedPost,
  PostPosition,
} from "../domain/post";
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

export type FindFeedAuthors = (
  authorIds: string[],
  viewerId: string | null,
) => Promise<FeedAuthorAccessView[]>;
