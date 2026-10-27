import { buildRelationshipView, type RelationshipView } from "../domain/relationshipView";
import type { AccountSocialStats } from "./getAccountSocialStats";
import type { PostCountPort, SocialStatisticsPort } from "./ports";

export type AccountSocialSummary = {
  relationship: RelationshipView;
  stats: AccountSocialStats;
};

export function createGetAccountSocialSummariesByIds(
  statistics: Pick<SocialStatisticsPort, "readSocialSummaryRows">,
  postCounts: PostCountPort,
) {
  return async (
    accountIds: string[],
    viewerId: string | null,
    options: { includeBlocked?: boolean } = {},
  ): Promise<Map<string, AccountSocialSummary>> => {
    const ids = [...new Set(accountIds)];
    if (ids.length === 0) return new Map();

    const [rows, counts] = await Promise.all([
      statistics.readSocialSummaryRows(ids, viewerId),
      postCounts.countAllPostsByAuthorIds(ids),
    ]);

    const followingSet = new Set<string>();
    const pendingSet = new Set<string>();
    const reciprocalSet = new Set<string>();
    const blockedByMeSet = new Set<string>();
    const blockedByThemSet = new Set<string>();

    for (const row of rows.outgoing) followingSet.add(row.id);
    for (const row of rows.pending) pendingSet.add(row.id);
    for (const row of rows.incoming) reciprocalSet.add(row.id);
    for (const row of rows.blockedByMe) blockedByMeSet.add(row.id);
    for (const row of rows.blockedByThem) blockedByThemSet.add(row.id);

    const followers = new Map(rows.followerCounts.map((row) => [row.id, row.total]));
    const following = new Map(rows.followingCounts.map((row) => [row.id, row.total]));
    const circles = new Map(rows.circleCounts.map((row) => [row.id, row.total]));
    const summaries = new Map<string, AccountSocialSummary>();

    for (const id of ids) {
      const blockedByMe = blockedByMeSet.has(id);
      const blockedByThem = blockedByThemSet.has(id);
      if (!options.includeBlocked && (blockedByMe || blockedByThem)) continue;

      summaries.set(id, {
        relationship: buildRelationshipView({
          acceptedFollow: followingSet.has(id),
          pendingRequest: pendingSet.has(id),
          reciprocalFollow: reciprocalSet.has(id),
          blockedByMe,
          blockedByThem,
        }),
        stats: {
          posts: counts.get(id) ?? 0,
          followers: followers.get(id) ?? 0,
          following: following.get(id) ?? 0,
          circles: circles.get(id) ?? 0,
        },
      });
    }

    return summaries;
  };
}
