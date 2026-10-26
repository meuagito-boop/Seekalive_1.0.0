import { Router, type IRouter } from "express";
import {
  issuePreAuthCsrf,
  loadActiveSession,
  PRE_AUTH_COOKIE,
} from "../../../security/session";
import { rotateSessionCsrfToken } from "../application/sessions/csrfSession";

const router: IRouter = Router();

router.get("/csrf", async (request, response) => {
  const session = await loadActiveSession(request);
  if (session) {
    const csrfToken = await rotateSessionCsrfToken(session.sessionId);
    response.json({ csrfToken });
    return;
  }

  response.cookie(PRE_AUTH_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  const csrfToken = issuePreAuthCsrf(response);
  response.json({ csrfToken });
});

export default router;
