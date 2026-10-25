import { and, eq, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, sessions } from "@workspace/db";
import {
  clearSessionCookie,
  hashToken,
  PRE_AUTH_COOKIE,
  requireCsrf,
  SESSION_COOKIE,
} from "../../../../security/session";

const router: IRouter = Router();

router.post("/logout", requireCsrf, async (request, response) => {
  const rawToken = request.cookies?.[SESSION_COOKIE];
  if (rawToken) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.tokenHash, hashToken(rawToken)), isNull(sessions.revokedAt)));
  }
  clearSessionCookie(response);
  response.clearCookie(PRE_AUTH_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  response.status(204).end();
});

export default router;
