import { countAllPostsByAuthorIds } from "../../feed/composition/publicApi";
import { createGetAccountSocialStats } from "../application/getAccountSocialStats";
import { createGetAccountSocialSummariesByIds } from "../application/getAccountSocialSummariesByIds";
import { createGetRelationshipFor } from "../application/getRelationshipFor";
import { createIsBlockedBetween } from "../application/isBlockedBetween";
import type {
  PostCountPort,
  RelationshipReadPort,
  SocialStatisticsPort,
} from "../application/ports";
import {
  readBlockedBetween,
  readRelationshipState,
} from "../infrastructure/relationshipReadRepository";
import {
  readAccountSocialStats,
  readSocialSummaryRows,
} from "../infrastructure/socialStatisticsRepository";

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

export const getRelationshipFor = createGetRelationshipFor(relationshipReads);
export const isBlockedBetween = createIsBlockedBetween(relationshipReads);
export const getAccountSocialStats = createGetAccountSocialStats(
  statistics,
  postCounts,
);
export const getAccountSocialSummariesByIds =
  createGetAccountSocialSummariesByIds(statistics, postCounts);
