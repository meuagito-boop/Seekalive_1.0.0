import { Router, type IRouter } from "express";
import { loadActiveSession } from "../../../security/activeSession";
import { issuePreAuthCsrf } from "../../../security/csrf";
import { PRE_AUTH_COOKIE } from "../../../security/sessionConfig";
import { csrfSessionOperations } from "../composition/sessions";

const router: IRouter = Router();

router.get("/csrf", async (request, response) => {
  const session = await loadActiveSession(request);
  if (session) {
    const csrfToken = await csrfSessionOperations.rotateSessionCsrfToken(
      session.sessionId,
    );
    response.json({ csrfToken });
    return;
  }

  response.cookie(PRE_AUTH_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  const csrfToken = issuePreAuthCsrf(response);
  response.json({ csrfToken });
});

export default router;
