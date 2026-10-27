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
  const stats = await readAccountSocialStats(accountId);
  return {
    posts: 0,
    ...stats,
  };
}
