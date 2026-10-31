import { Router, type IRouter } from "express";
import { accountViewsByIds } from "../../profiles/composition/publicApi";
import { listFeedFollowingAccountIds } from "../../social/composition/feedIntegration";
import { createPostCreator } from "../application/createPost";
import { createPostDeleter } from "../application/deletePost";
import { createPostReader } from "../application/readPost";
import { createArticleReader } from "../application/readArticle";
import { createPostLikeSetter } from "../application/setPostLike";
import { createPostRepostSetter } from "../application/setPostRepost";
import { createPostBookmarkSetter } from "../application/setPostBookmark";
import { createPostCommentCreator } from "../application/createPostComment";
import { createPostCommentLister } from "../application/listPostComments";
import { createGlobalFeedLister } from "../application/listGlobalFeed";
import { createPostCommentDeleter } from "../application/deletePostComment";
import { createCommentLikeSetter } from "../application/setCommentLike";
import {
  findFeedPostById,
  listFeedPostsForTimeline,
} from "../infrastructure/postRepository";
import {
  createFeedPostComment,
  deleteOwnedFeedPostComment,
  findFeedPostComment,
  findFeedPostCommentOnPost,
  listFeedPostComments,
} from "../infrastructure/postCommentRepository";
import {
  findCommentInteraction,
  findCommentInteractionSummaries,
  findPostInteractionSummaries,
} from "../infrastructure/postInteractionSummaryRepository";
import { setFeedCommentLike } from "../infrastructure/commentLikeRepository";
import { setFeedPostLike } from "../infrastructure/postLikeRepository";
import { setFeedPostRepost } from "../infrastructure/postRepostRepository";
import { setFeedPostBookmark } from "../infrastructure/postBookmarkRepository";
import { createProfilePostListApi } from "./publicApi";
import { createArticleReadRoutes } from "../presentation/articleReadRoutes";
import { createArticleWriteRoutes } from "../presentation/articleWriteRoutes";
import { createPostCreateRoutes } from "../presentation/postCreateRoutes";
import { createPostDeleteRoutes } from "../presentation/postDeleteRoutes";
import { createPostReadRoutes } from "../presentation/postReadRoutes";
import { createProfileContentRoutes } from "../presentation/profileContentRoutes";
import { createPostLikeRoutes } from "../presentation/postLikeRoutes";
import { createPostRepostRoutes } from "../presentation/postRepostRoutes";
import { createPostBookmarkRoutes } from "../presentation/postBookmarkRoutes";
import { createPostCommentRoutes } from "../presentation/postCommentRoutes";
import { createCommentDeleteRoutes } from "../presentation/commentDeleteRoutes";
import { createCommentLikeRoutes } from "../presentation/commentLikeRoutes";
import { createGlobalFeedRoutes } from "../presentation/globalFeedRoutes";
import type { FeedCommentAuthor } from "../domain/postInteractions";
import {
  deleteFeedPostWithMedia,
  persistFeedPost,
} from "./postPersistence";

async function findCommentAuthors(
  ids: string[],
  viewerId: string,
): Promise<FeedCommentAuthor[]> {
  const views = await accountViewsByIds(ids, viewerId);
  return views.map((view) => ({
    id: view.id,
    username: view.username,
    displayName: view.displayName,
    avatarUrl: view.avatarUrl,
  }));
}

const createPost = createPostCreator(persistFeedPost);
const deletePost = createPostDeleter(deleteFeedPostWithMedia);
export const readFeedPost = createPostReader(
  findFeedPostById,
  accountViewsByIds,
  findPostInteractionSummaries,
);
const readPost = readFeedPost;
const readArticle = createArticleReader(readPost);
const listProfilePosts = createProfilePostListApi(accountViewsByIds);
const listGlobalFeed = createGlobalFeedLister(
  listFeedPostsForTimeline,
  accountViewsByIds,
  findPostInteractionSummaries,
  listFeedFollowingAccountIds,
);
const setPostLike = createPostLikeSetter(readPost, setFeedPostLike);
const setPostRepost = createPostRepostSetter(readPost, setFeedPostRepost);
const setPostBookmark = createPostBookmarkSetter(readPost, setFeedPostBookmark);
const createComment = createPostCommentCreator({
  readPost,
  findCommentOnPost: findFeedPostCommentOnPost,
  insertComment: createFeedPostComment,
  findAuthors: findCommentAuthors,
  findInteraction: findCommentInteraction,
});
const listComments = createPostCommentLister({
  readPost,
  listComments: listFeedPostComments,
  findAuthors: findCommentAuthors,
  findInteractions: findCommentInteractionSummaries,
});
const deleteComment = createPostCommentDeleter(deleteOwnedFeedPostComment);
const setCommentLike = createCommentLikeSetter({
  findComment: findFeedPostComment,
  readPost,
  persistLike: setFeedCommentLike,
  findAuthors: findCommentAuthors,
  findInteraction: findCommentInteraction,
});

const router: IRouter = Router();
router.use(createGlobalFeedRoutes(listGlobalFeed));
router.use(createArticleWriteRoutes(createPost));
router.use(createArticleReadRoutes(readArticle));
router.use(createPostReadRoutes(readPost));
router.use(createPostCreateRoutes(createPost));
router.use(createPostDeleteRoutes(deletePost));
router.use(createProfileContentRoutes(listProfilePosts));
router.use(createPostLikeRoutes(setPostLike));
router.use(createPostRepostRoutes(setPostRepost));
router.use(createPostBookmarkRoutes(setPostBookmark));
router.use(createPostCommentRoutes(createComment, listComments));
router.use(createCommentDeleteRoutes(deleteComment));
router.use(createCommentLikeRoutes(setCommentLike));

export default router;
