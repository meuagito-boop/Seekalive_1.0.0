import { randomBytes } from "node:crypto";
import { csrfHash } from "../../../security/csrf";
import { SESSION_TTL_SECONDS } from "../../../security/sessionConfig";
import { hashToken } from "../../../security/tokenHashing";

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
