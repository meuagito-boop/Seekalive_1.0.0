import { createHmac, randomBytes } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { sendApiError } from "../common/apiErrors";
import { PRE_AUTH_COOKIE, sessionSecret } from "./sessionConfig";
import { loadActiveSession } from "./activeSession";
import { setPreAuthCookie } from "./preAuthCookies";
import { constantTimeEquals, hashToken } from "./tokenHashing";

function createPreAuthCsrf(nonce: string): string {
  return createHmac("sha256", sessionSecret).update(`pre-auth-csrf:${nonce}`).digest("base64url");
}

export function issuePreAuthCsrf(response: Response): string {
  const nonce = randomBytes(32).toString("base64url");
  setPreAuthCookie(response, nonce);
  return createPreAuthCsrf(nonce);
}

export function csrfHash(token: string): string {
  return hashToken(token);
}

function requestHasSameOrigin(request: Request): boolean {
  const origin = request.get("origin");
  if (!origin) return true;
  if (origin === "null") return false;

  const forwardedProto = request.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || request.protocol;
  const host = request.get("x-forwarded-host")?.split(",")[0]?.trim() || request.get("host");
  return Boolean(host && origin === `${protocol}://${host}`);
}

export const requireCsrf: RequestHandler = async (
  request: Request,
  response: Response,
  next: NextFunction,
) => {
  response.setHeader("Cache-Control", "no-store");
  if (!requestHasSameOrigin(request)) {
    sendApiError(response, 403, "CSRF_REJECTED", "Origem não permitida.");
    return;
  }

  const suppliedToken = request.get("x-csrf-token") ?? "";
  const session = await loadActiveSession(request);
  if (session) {
    if (constantTimeEquals(csrfHash(suppliedToken), session.csrfTokenHash)) {
      next();
      return;
    }
  } else {
    const preAuthNonce = request.cookies?.[PRE_AUTH_COOKIE];
    if (preAuthNonce && constantTimeEquals(createPreAuthCsrf(preAuthNonce), suppliedToken)) {
      next();
      return;
    }
  }

  sendApiError(response, 403, "CSRF_REJECTED", "A solicitação expirou. Atualize a página e tente novamente.");
};
