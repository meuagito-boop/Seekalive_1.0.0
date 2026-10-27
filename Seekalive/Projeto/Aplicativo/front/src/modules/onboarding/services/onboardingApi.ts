import { postJson } from "@/modules/app/api/httpClient";

export function completeOnboarding(payload: {
  interests: string[];
  skipped: boolean;
}) {
  return postJson<{ onboardingCompleted: true; interestCount: number }>(
    "/onboarding/interests",
    payload,
  );
}
