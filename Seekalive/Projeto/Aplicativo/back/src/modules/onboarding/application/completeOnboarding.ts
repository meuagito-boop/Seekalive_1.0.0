import { persistOnboardingCompletion } from "../infrastructure/onboardingRepository";

export async function completeOnboarding(
  accountId: string,
  input: { interests: string[]; skipped: boolean },
): Promise<number> {
  const interests = input.skipped ? [] : input.interests;
  const completedAt = new Date();

  await persistOnboardingCompletion(accountId, interests, completedAt);

  return interests.length;
}
