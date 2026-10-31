import {
  countPostHashtags,
  HASHTAG_LIMIT_MESSAGE,
  MAX_HASHTAGS_PER_POST,
} from "@workspace/api-zod";
import type { NewFeedPost } from "./post";

export class FeedHashtagLimitExceededError extends Error {
  constructor() {
    super(HASHTAG_LIMIT_MESSAGE);
    this.name = "FeedHashtagLimitExceededError";
  }
}

export function assertPostHashtagLimit(post: NewFeedPost): void {
  if (
    countPostHashtags(post.content, post.articleTitle, post.articleBody) >
    MAX_HASHTAGS_PER_POST
  ) {
    throw new FeedHashtagLimitExceededError();
  }
}
