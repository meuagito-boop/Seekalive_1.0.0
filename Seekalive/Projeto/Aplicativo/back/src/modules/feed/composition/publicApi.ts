import { createCountAllPostsByAuthorIds } from "../application/countAuthorPosts";
import { createProfilePostLister } from "../application/listProfilePosts";
import {
  countFeedPostsByAuthorIds,
  listFeedPostsByAuthor,
} from "../infrastructure/postRepository";
import type { FindFeedAuthors } from "../application/ports";

export const countAllPostsByAuthorIds = createCountAllPostsByAuthorIds(
  countFeedPostsByAuthorIds,
);

export function createProfilePostListApi(findAuthors: FindFeedAuthors) {
  return createProfilePostLister(listFeedPostsByAuthor, findAuthors);
}
