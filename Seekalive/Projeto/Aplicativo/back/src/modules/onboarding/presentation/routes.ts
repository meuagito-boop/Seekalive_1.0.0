import { Router, type IRouter } from "express";
import { onboardingCompletionSchema } from "@workspace/api-zod";
import { loadActiveSession, requireCsrf } from "../../../security/session";
import { completeOnboarding } from "../application/completeOnboarding";

const router: IRouter = Router();

router.post("/interests", requireCsrf, async (request, response) => {
  const session = await loadActiveSession(request);
  if (!session) {
    response.status(401).json({
      error: {
        code: "UNAUTHENTICATED",
        message: "Entre para continuar.",
        requestId: response.locals.requestId ?? "unknown",
      },
    });
    return;
  }

  const parsed = onboardingCompletionSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Confira os interesses selecionados.",
        details: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
        requestId: response.locals.requestId ?? "unknown",
      },
    });
    return;
  }

  const interestCount = await completeOnboarding(session.accountId, parsed.data);

  response.json({ onboardingCompleted: true, interestCount });
});

export default router;
