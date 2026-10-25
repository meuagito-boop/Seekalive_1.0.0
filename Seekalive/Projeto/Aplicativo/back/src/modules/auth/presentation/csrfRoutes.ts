import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, sessions } from "@workspace/db";
import {
  csrfHash,
  issuePreAuthCsrf,
  loadActiveSession,
  PRE_AUTH_COOKIE,
} from "../../../security/session";

const router: IRouter = Router();

router.get("/csrf", async (request, response) => {
  const session = await loadActiveSession(request);
  if (session) {
    const csrfToken = randomBytes(32).toString("base64url");
    await db.update(sessions).set({ csrfTokenHash: csrfHash(csrfToken) }).where(eq(sessions.id, session.sessionId));
    response.json({ csrfToken });
    return;
  }

  response.cookie(PRE_AUTH_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  const csrfToken = issuePreAuthCsrf(response);
  response.json({ csrfToken });
});

export default router;
