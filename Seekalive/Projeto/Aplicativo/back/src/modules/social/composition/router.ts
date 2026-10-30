import { Router, type IRouter } from "express";
import {
  acceptFollowRequest,
  blockAccount,
  declineFollowRequest,
  followAccount,
  unblockAccount,
  unfollowAccount,
} from "./publicApi";
import {
  blockedAccountViews,
  circleAccountViews,
  followerAccountViews,
  followingAccountViews,
  incomingFollowRequestViews,
  resolveRelationshipListTarget,
  searchAccountViews,
} from "./relationshipListServices";
import { createAcceptFollowRequestRoutes } from "../presentation/acceptFollowRequestRoutes";
import { createAccountSearchRoutes } from "../presentation/accountSearchRoutes";
import { createBlockAccountRoutes } from "../presentation/blockAccountRoutes";
import { createBlockListRoutes } from "../presentation/blockListRoutes";
import { createCircleRoutes } from "../presentation/circleRoutes";
import { createDeclineFollowRequestRoutes } from "../presentation/declineFollowRequestRoutes";
import { createFollowerListRoutes } from "../presentation/followerListRoutes";
import { createFollowingListRoutes } from "../presentation/followingListRoutes";
import { createFollowAccountRoutes } from "../presentation/followAccountRoutes";
import { createFollowRequestListRoutes } from "../presentation/followRequestListRoutes";
import { createUnblockAccountRoutes } from "../presentation/unblockAccountRoutes";
import { createUnfollowAccountRoutes } from "../presentation/unfollowAccountRoutes";

const router: IRouter = Router();

router.use(createAccountSearchRoutes(searchAccountViews));
router.use(
  createFollowerListRoutes(followerAccountViews, resolveRelationshipListTarget),
);
router.use(
  createFollowingListRoutes(
    followingAccountViews,
    resolveRelationshipListTarget,
  ),
);
router.use(createFollowAccountRoutes(followAccount));
router.use(createUnfollowAccountRoutes(unfollowAccount));
router.use(createFollowRequestListRoutes(incomingFollowRequestViews));
router.use(createAcceptFollowRequestRoutes(acceptFollowRequest));
router.use(createDeclineFollowRequestRoutes(declineFollowRequest));
router.use(createCircleRoutes(circleAccountViews));
router.use(createBlockListRoutes(blockedAccountViews));
router.use(createBlockAccountRoutes(blockAccount));
router.use(createUnblockAccountRoutes(unblockAccount));

export default router;
