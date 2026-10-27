import type { RelationshipState, RelationshipView } from "../domain/relationshipView";

export type FollowMutationResult =
  | { status: "accepted" | "pending"; updatedAt: string }
  | null;

export interface RelationshipMutationPort {
  follow(actorId: string, targetId: string): Promise<FollowMutationResult>;
  unfollow(actorId: string, targetId: string): Promise<void>;
  acceptFollowRequest(targetId: string, requesterId: string): Promise<boolean>;
  declineFollowRequest(targetId: string, requesterId: string): Promise<void>;
  block(actorId: string, targetId: string): Promise<boolean>;
  unblock(actorId: string, targetId: string): Promise<void>;
}

export interface RelationshipReadPort {
  readRelationshipState(viewerId: string, targetId: string): Promise<RelationshipState>;
  readBlockedBetween(firstId: string, secondId: string): Promise<boolean>;
}

export type RelationshipCounts = {
  followers: number;
  following: number;
  circles: number;
};

export type SocialSummaryRows = {
  followerCounts: { id: string; total: number }[];
  followingCounts: { id: string; total: number }[];
  circleCounts: { id: string; total: number }[];
  outgoing: { id: string }[];
  pending: { id: string }[];
  incoming: { id: string }[];
  blockedByMe: { id: string }[];
  blockedByThem: { id: string }[];
};

export interface SocialStatisticsPort {
  readAccountSocialStats(accountId: string): Promise<RelationshipCounts>;
  readSocialSummaryRows(
    accountIds: string[],
    viewerId: string | null,
  ): Promise<SocialSummaryRows>;
}

export interface PostCountPort {
  countAllPostsByAuthorIds(authorIds: string[]): Promise<Map<string, number>>;
}

export interface AccountListQueryPort {
  searchVerifiedAccountIds(
    query: string,
    limit: number,
    offset: number,
  ): Promise<{ id: string }[]>;
  listFollowerIds(accountId: string, limit: number, offset: number): Promise<{ id: string }[]>;
  listFollowingIds(accountId: string, limit: number, offset: number): Promise<{ id: string }[]>;
  listCircleIds(accountId: string, limit: number, offset: number): Promise<{ id: string }[]>;
  listIncomingFollowRequests(
    accountId: string,
    limit: number,
    offset: number,
  ): Promise<{ id: string; createdAt: Date }[]>;
  listBlockedAccountIds(accountId: string): Promise<{ id: string }[]>;
}

export type AccountViewLookupPort<TAccount extends { id: string }> = (
  ids: string[],
  viewerId: string | null,
  options?: { includeBlocked?: boolean },
) => Promise<TAccount[]>;

export interface RelationshipListTargetPort {
  findActiveAccountById(
    accountId: string,
  ): Promise<{ id: string; isPrivate: boolean } | null>;
  getRelationshipFor(
    viewerId: string | null,
    targetId: string,
  ): Promise<RelationshipView>;
}
