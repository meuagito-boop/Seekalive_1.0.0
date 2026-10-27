import { createOnboardingCompleter } from "../application/completeOnboarding";
import { persistOnboardingCompletion } from "../infrastructure/onboardingRepository";
import { createOnboardingRouter } from "../presentation/routes";

const completeOnboarding = createOnboardingCompleter(
  persistOnboardingCompletion,
);

export default createOnboardingRouter(completeOnboarding);
