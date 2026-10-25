import { Router, type IRouter } from "express";
import { loadActiveSession } from "../../../../security/session";

const router: IRouter = Router();

router.get("/session", async (request, response) => {
  const activeSession = await loadActiveSession(request);
  if (!activeSession) {
    response.json({ authenticated: false, account: null, session: null });
    return;
  }
  response.json({
    authenticated: true,
    account: {
      id: activeSession.accountId,
      username: activeSession.username,
      displayName: activeSession.displayName,
      accountType: activeSession.accountType,
      joinedAt: activeSession.createdAt.toISOString(),
      onboardingCompleted: activeSession.onboardingCompletedAt !== null,
    },
    session: {
      id: activeSession.sessionId,
      createdAt: activeSession.createdAt.toISOString(),
      expiresAt: activeSession.expiresAt.toISOString(),
    },
  });
});

export default router;
