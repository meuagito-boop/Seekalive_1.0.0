import { createCountAllPostsByAuthorIds } from "../application/countAuthorPosts";
import { countFeedPostsByAuthorIds } from "../infrastructure/postRepository";

export const countAllPostsByAuthorIds = createCountAllPostsByAuthorIds(
  countFeedPostsByAuthorIds,
);
