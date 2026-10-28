import type { User } from "@/modules/profile/types/user";

export interface CompleteOnboardingInput {
  account: User;
  interests: string[];
  skipped: boolean;
  isDevelopmentPreview: boolean;
  saveRemote: (payload: {
    interests: string[];
    skipped: boolean;
  }) => Promise<unknown>;
  updateAccount: (account: User) => void;
  updateSocialAccount: (account: User) => void;
}

export async function completeOnboarding({
  account,
  interests,
  skipped,
  isDevelopmentPreview,
  saveRemote,
  updateAccount,
  updateSocialAccount,
}: CompleteOnboardingInput): Promise<User> {
  const selectedInterests = skipped ? [] : interests;

  if (!isDevelopmentPreview) {
    await saveRemote({ interests: selectedInterests, skipped });
  }

  const updatedAccount: User = {
    ...account,
    interests: selectedInterests,
    onboardingCompleted: true,
  };

  updateAccount(updatedAccount);
  if (!isDevelopmentPreview) updateSocialAccount(updatedAccount);

  return updatedAccount;
}
