import type { PostCountPort, SocialStatisticsPort } from "./ports";

export type AccountSocialStats = {
  posts: number;
  followers: number;
  following: number;
  circles: number;
};

export function createGetAccountSocialStats(
  statistics: Pick<SocialStatisticsPort, "readAccountSocialStats">,
  postCounts: PostCountPort,
) {
  return async (accountId: string): Promise<AccountSocialStats> => {
    const [stats, counts] = await Promise.all([
      statistics.readAccountSocialStats(accountId),
      postCounts.countAllPostsByAuthorIds([accountId]),
    ]);
    return {
      posts: counts.get(accountId) ?? 0,
      ...stats,
    };
  };
}
