import { countAllPostsByAuthorIds } from "../../feed/composition/publicApi";
import { createAcceptFollowRequest } from "../application/acceptFollowRequest";
import { createBlockAccount } from "../application/blockAccount";
import { createDeclineFollowRequest } from "../application/declineFollowRequest";
import { createFollowAccount } from "../application/followAccount";
import { createGetAccountSocialStats } from "../application/getAccountSocialStats";
import { createGetAccountSocialSummariesByIds } from "../application/getAccountSocialSummariesByIds";
import { createGetRelationshipFor } from "../application/getRelationshipFor";
import { createIsBlockedBetween } from "../application/isBlockedBetween";
import { createUnblockAccount } from "../application/unblockAccount";
import { createUnfollowAccount } from "../application/unfollowAccount";
import type {
  PostCountPort,
  RelationshipMutationPort,
  RelationshipReadPort,
  SocialStatisticsPort,
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
  readBlockedBetween,
  readRelationshipState,
} from "../infrastructure/relationshipReadRepository";
import {
  readAccountSocialStats,
  readSocialSummaryRows,
} from "../infrastructure/socialStatisticsRepository";

const relationshipMutations: RelationshipMutationPort = {
  follow: persistFollowAccount,
  unfollow: persistUnfollowAccount,
  acceptFollowRequest: persistFollowRequestAcceptance,
  declineFollowRequest: persistFollowRequestDecline,
  block: persistBlockAccount,
  unblock: persistUnblockAccount,
};

const relationshipReads: RelationshipReadPort = {
  readRelationshipState,
  readBlockedBetween,
};

const statistics: SocialStatisticsPort = {
  readAccountSocialStats,
  readSocialSummaryRows,
};

const postCounts: PostCountPort = {
  countAllPostsByAuthorIds,
};

export const followAccount = createFollowAccount(relationshipMutations);
export const unfollowAccount = createUnfollowAccount(relationshipMutations);
export const acceptFollowRequest = createAcceptFollowRequest(relationshipMutations);
export const declineFollowRequest = createDeclineFollowRequest(relationshipMutations);
export const blockAccount = createBlockAccount(relationshipMutations);
export const unblockAccount = createUnblockAccount(relationshipMutations);
export const getRelationshipFor = createGetRelationshipFor(relationshipReads);
export const isBlockedBetween = createIsBlockedBetween(relationshipReads);
export const getAccountSocialStats = createGetAccountSocialStats(statistics, postCounts);
export const getAccountSocialSummariesByIds = createGetAccountSocialSummariesByIds(
  statistics,
  postCounts,
);
