import { randomBytes } from "node:crypto";
import { csrfHash, hashToken, SESSION_TTL_SECONDS } from "../../../security/session";

export function createSessionMaterial() {
  const rawToken = randomBytes(32).toString("base64url");
  const csrfToken = randomBytes(32).toString("base64url");
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_TTL_SECONDS * 1000);

  return {
    rawToken,
    tokenHash: hashToken(rawToken),
    csrfToken,
    csrfTokenHash: csrfHash(csrfToken),
    createdAt,
    expiresAt,
  };
}
