import { Router, type IRouter } from "express";
import acceptFollowRequestRouter from "./acceptFollowRequestRoutes";
import accountSearchRouter from "./accountSearchRoutes";
import blockAccountRouter from "./blockAccountRoutes";
import blockListRouter from "./blockListRoutes";
import circleRouter from "./circleRoutes";
import declineFollowRequestRouter from "./declineFollowRequestRoutes";
import followerListRouter from "./followerListRoutes";
import followingListRouter from "./followingListRoutes";
import followAccountRouter from "./followAccountRoutes";
import followRequestListRouter from "./followRequestListRoutes";
import unblockAccountRouter from "./unblockAccountRoutes";
import unfollowAccountRouter from "./unfollowAccountRoutes";

const router: IRouter = Router();

router.use(accountSearchRouter);
router.use(followerListRouter);
router.use(followingListRouter);
router.use(followAccountRouter);
router.use(unfollowAccountRouter);
router.use(followRequestListRouter);
router.use(acceptFollowRequestRouter);
router.use(declineFollowRequestRouter);
router.use(circleRouter);
router.use(blockListRouter);
router.use(blockAccountRouter);
router.use(unblockAccountRouter);

export default router;
