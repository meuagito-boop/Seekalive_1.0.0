import { createAcceptFollowRequest } from "../application/acceptFollowRequest";
import { createBlockAccount } from "../application/blockAccount";
import { createDeclineFollowRequest } from "../application/declineFollowRequest";
import { createFollowAccount } from "../application/followAccount";
import { createUnblockAccount } from "../application/unblockAccount";
import { createUnfollowAccount } from "../application/unfollowAccount";
import type {
  RelationshipMutationPort,
} from "../application/ports";
import {
  persistFollowRequestAcceptance,
  persistFollowRequestDecline,
  persistFollowAccount,
  persistUnfollowAccount,
} from "../infrastructure/followMutationRepository";
import {
  persistBlockAccount,
  persistUnblockAccount,
} from "../infrastructure/blockMutationRepository";
import {
  getAccountSocialStats,
  getAccountSocialSummariesByIds,
  getRelationshipFor,
  isBlockedBetween,
} from "./profileSocialViews";

const relationshipMutations: RelationshipMutationPort = {
  follow: persistFollowAccount,
  unfollow: persistUnfollowAccount,
  acceptFollowRequest: persistFollowRequestAcceptance,
  declineFollowRequest: persistFollowRequestDecline,
  block: persistBlockAccount,
  unblock: persistUnblockAccount,
};

export const followAccount = createFollowAccount(relationshipMutations);
export const unfollowAccount = createUnfollowAccount(relationshipMutations);
export const acceptFollowRequest = createAcceptFollowRequest(relationshipMutations);
export const declineFollowRequest = createDeclineFollowRequest(relationshipMutations);
export const blockAccount = createBlockAccount(relationshipMutations);
export const unblockAccount = createUnblockAccount(relationshipMutations);
export {
  getAccountSocialStats,
  getAccountSocialSummariesByIds,
  getRelationshipFor,
  isBlockedBetween,
};
