export type PersistOnboardingCompletion = (
  accountId: string,
  interests: string[],
  completedAt: Date,
) => Promise<void>;
