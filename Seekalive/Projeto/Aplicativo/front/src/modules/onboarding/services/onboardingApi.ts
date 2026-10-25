import { postJson } from "@/modules/auth/services/http";

export function completeOnboarding(payload: { interests: string[]; skipped: boolean }) {
  return postJson<{ onboardingCompleted: true; interestCount: number }>("/onboarding/interests", payload);
}
