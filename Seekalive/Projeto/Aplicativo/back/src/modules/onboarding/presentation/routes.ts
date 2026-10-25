import { Router, type IRouter } from "express";
import { onboardingCompletionSchema } from "@workspace/api-zod";
import { sendApiError, sendApiValidationError } from "../../../common/apiErrors";
import { loadActiveSession, requireCsrf } from "../../../security/session";
import { completeOnboarding } from "../application/completeOnboarding";

const router: IRouter = Router();

router.post("/interests", requireCsrf, async (request, response) => {
  const session = await loadActiveSession(request);
  if (!session) {
    sendApiError(response, 401, "UNAUTHENTICATED", "Entre para continuar.");
    return;
  }

  const parsed = onboardingCompletionSchema.safeParse(request.body);
  if (!parsed.success) {
    sendApiValidationError(response, parsed.error.issues, "Confira os interesses selecionados.");
    return;
  }

  const interestCount = await completeOnboarding(session.accountId, parsed.data);

  response.json({ onboardingCompleted: true, interestCount });
});

export default router;
