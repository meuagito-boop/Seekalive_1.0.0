import { randomBytes } from "node:crypto";
import { csrfHash } from "../../../../security/session";

export type SessionCsrfRepository = {
  updateCsrfTokenHash(sessionId: string, tokenHash: string): Promise<void>;
};

export function createRotateSessionCsrfToken(
  repository: SessionCsrfRepository,
) {
  return async function rotateSessionCsrfToken(
    sessionId: string,
  ): Promise<string> {
    const csrfToken = randomBytes(32).toString("base64url");
    await repository.updateCsrfTokenHash(sessionId, csrfHash(csrfToken));
    return csrfToken;
  };
}
