import {
  accountViewsByIds,
  findActiveAccountById,
} from "../../accounts/composition/publicApi";
import { createRelationshipListQueries } from "../application/relationshipListQueries";
import { createResolveRelationshipListTarget } from "../application/resolveRelationshipListTarget";
import type { AccountListQueryPort, RelationshipListTargetPort } from "../application/ports";
import {
  listBlockedAccountIds,
  listCircleIds,
  listFollowerIds,
  listFollowingIds,
  listIncomingFollowRequests,
  searchVerifiedAccountIds,
} from "../infrastructure/socialAccountListRepository";
import { getRelationshipFor } from "./publicApi";

const accountLists: AccountListQueryPort = {
  searchVerifiedAccountIds,
  listFollowerIds,
  listFollowingIds,
  listCircleIds,
  listIncomingFollowRequests,
  listBlockedAccountIds,
};

const relationshipListTarget: RelationshipListTargetPort = {
  findActiveAccountById,
  getRelationshipFor,
};

const listQueries = createRelationshipListQueries(accountLists, accountViewsByIds);

export const {
  searchAccountViews,
  followerAccountViews,
  followingAccountViews,
  circleAccountViews,
  incomingFollowRequestViews,
  blockedAccountViews,
} = listQueries;

export const resolveRelationshipListTarget =
  createResolveRelationshipListTarget(relationshipListTarget);
