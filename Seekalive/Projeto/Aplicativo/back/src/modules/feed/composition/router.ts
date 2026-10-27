import { Router, type IRouter } from "express";
import { accountViewsByIds } from "../../accounts/composition/publicApi";
import { createPostCreator } from "../application/createPost";
import { createPostDeleter } from "../application/deletePost";
import { createPostReader } from "../application/readPost";
import { createArticleReader } from "../application/readArticle";
import {
  deleteOwnedFeedPost,
  findFeedPostById,
  insertFeedPost,
} from "../infrastructure/postRepository";
import { createProfilePostListApi } from "./publicApi";
import { createArticleReadRoutes } from "../presentation/articleReadRoutes";
import { createArticleWriteRoutes } from "../presentation/articleWriteRoutes";
import { createPostCreateRoutes } from "../presentation/postCreateRoutes";
import { createPostDeleteRoutes } from "../presentation/postDeleteRoutes";
import { createPostReadRoutes } from "../presentation/postReadRoutes";
import { createProfileContentRoutes } from "../presentation/profileContentRoutes";

const createPost = createPostCreator(insertFeedPost);
const deletePost = createPostDeleter(deleteOwnedFeedPost);
const readPost = createPostReader(findFeedPostById, accountViewsByIds);
const readArticle = createArticleReader(readPost);
const listProfilePosts = createProfilePostListApi(accountViewsByIds);

const router: IRouter = Router();
router.use(createArticleWriteRoutes(createPost));
router.use(createArticleReadRoutes(readArticle));
router.use(createPostReadRoutes(readPost));
router.use(createPostCreateRoutes(createPost));
router.use(createPostDeleteRoutes(deletePost));
router.use(createProfileContentRoutes(listProfilePosts));

export default router;
