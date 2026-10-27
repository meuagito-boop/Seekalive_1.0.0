import { eq } from "drizzle-orm";
import { db, sessions } from "@workspace/db";
import type { SessionCsrfRepository } from "../application/sessions/csrfSession";

export const csrfSessionRepository: SessionCsrfRepository = {
  async updateCsrfTokenHash(sessionId, tokenHash) {
    await db
      .update(sessions)
      .set({ csrfTokenHash: tokenHash })
      .where(eq(sessions.id, sessionId));
  },
};
