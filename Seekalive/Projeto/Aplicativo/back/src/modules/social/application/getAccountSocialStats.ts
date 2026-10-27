import { countAllPostsByAuthorIds } from "../../feed/application/countAuthorPosts";
import { readAccountSocialStats } from "../infrastructure/socialStatisticsRepository";

export type AccountSocialStats = {
  posts: number;
  followers: number;
  following: number;
  circles: number;
};

export async function getAccountSocialStats(
  accountId: string,
): Promise<AccountSocialStats> {
  const [stats, postCounts] = await Promise.all([
    readAccountSocialStats(accountId),
    countAllPostsByAuthorIds([accountId]),
  ]);
  return {
    posts: postCounts.get(accountId) ?? 0,
    ...stats,
  };
}
