import { postJson } from "@/modules/app/api/httpClient";

export function saveOnboardingInterests(payload: {
  interests: string[];
  skipped: boolean;
}) {
  return postJson<{ onboardingCompleted: true; interestCount: number }>(
    "/onboarding/interests",
    payload,
  );
}
