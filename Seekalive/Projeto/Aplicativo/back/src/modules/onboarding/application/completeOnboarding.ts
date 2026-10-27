import type { PersistOnboardingCompletion } from "./ports";

export type CompleteOnboardingInput = {
  interests: string[];
  skipped: boolean;
};

export function createOnboardingCompleter(
  persistCompletion: PersistOnboardingCompletion,
) {
  return async function completeOnboarding(
    accountId: string,
    input: CompleteOnboardingInput,
  ): Promise<number> {
    const interests = input.skipped ? [] : input.interests;
    const completedAt = new Date();

    await persistCompletion(accountId, interests, completedAt);

    return interests.length;
  };
}

export type CompleteOnboarding = ReturnType<typeof createOnboardingCompleter>;
