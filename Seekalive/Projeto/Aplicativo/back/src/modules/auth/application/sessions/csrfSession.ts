import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, sessions } from "@workspace/db";
import { csrfHash } from "../../../../security/session";

export async function rotateSessionCsrfToken(sessionId: string): Promise<string> {
  const csrfToken = randomBytes(32).toString("base64url");
  await db
    .update(sessions)
    .set({ csrfTokenHash: csrfHash(csrfToken) })
    .where(eq(sessions.id, sessionId));
  return csrfToken;
}
