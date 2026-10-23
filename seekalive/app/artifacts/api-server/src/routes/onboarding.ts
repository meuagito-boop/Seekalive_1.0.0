import { and, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { accountInterests, accounts, db } from "@workspace/db";
import { onboardingCompletionSchema } from "@workspace/api-zod";
import { loadActiveSession, requireCsrf } from "../lib/auth/security";

const router: IRouter = Router();

router.post("/interests", requireCsrf, async (request, response) => {
  const session = await loadActiveSession(request);
  if (!session) {
    response.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Entre para continuar." } });
    return;
  }

  const parsed = onboardingCompletionSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Confira os interesses selecionados.",
        details: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      },
    });
    return;
  }

  const interests = parsed.data.skipped ? [] : parsed.data.interests;
  const completedAt = new Date();
  await db.transaction(async (tx) => {
    await tx.delete(accountInterests).where(eq(accountInterests.accountId, session.accountId));
    if (interests.length > 0) {
      await tx.insert(accountInterests).values(
        interests.map((interestKey) => ({ accountId: session.accountId, interestKey })),
      );
    }
    await tx
      .update(accounts)
      .set({ onboardingCompletedAt: completedAt, updatedAt: completedAt })
      .where(and(eq(accounts.id, session.accountId), eq(accounts.status, "active")));
  });

  response.json({ onboardingCompleted: true, interestCount: interests.length });
});

export default router;
