import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { PASSWORD_POLICY_VERSION } from "@workspace/api-zod";
import { accountEmails, accounts, db, passwordCredentials, sessions, trustedDevices } from "@workspace/db";

export const SESSION_COOKIE = "__Host-seekalive_session";
export const PRE_AUTH_COOKIE = "__Host-seekalive_pre_auth";
export const DEVICE_COOKIE = "__Host-seekalive_device";
const DEVICE_COOKIE_MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000;

const sessionSecret = process.env.SESSION_SECRET ?? "";
if (Buffer.byteLength(sessionSecret) < 32) {
  throw new Error("SESSION_SECRET must contain at least 32 bytes for authentication.");
}

const configuredTtl = Number(process.env.SESSION_TTL_SECONDS ?? 60 * 60 * 24 * 7);
if (!Number.isInteger(configuredTtl) || configuredTtl < 60 || configuredTtl > 60 * 60 * 24 * 30) {
  throw new Error("SESSION_TTL_SECONDS must be between 60 seconds and 30 days.");
}
export const SESSION_TTL_SECONDS = configuredTtl;

export function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hashVerificationCode(accountId: string, code: string): string {
  return createHmac("sha256", sessionSecret)
    .update(`verify_email:${accountId}:${code}`)
    .digest("hex");
}

export function hashPasswordResetCode(accountId: string, code: string): string {
  return createHmac("sha256", sessionSecret)
    .update(`reset_password:${accountId}:${code}`)
    .digest("hex");
}

export function hashDeviceLoginCode(accountId: string, challengeId: string, code: string): string {
  return createHmac("sha256", sessionSecret)
    .update(`device_login:${accountId}:${challengeId}:${code}`)
    .digest("hex");
}

export function hashPasswordUpdateCode(accountId: string, challengeId: string, code: string): string {
  return createHmac("sha256", sessionSecret)
    .update(`password_update:${accountId}:${challengeId}:${code}`)
    .digest("hex");
}

export function hashAccountPasswordChangeCode(accountId: string, challengeId: string, code: string): string {
  return createHmac("sha256", sessionSecret)
    .update(`account_password_change:${accountId}:${challengeId}:${code}`)
    .digest("hex");
}

export function hashAccountEmailChangeCode(
  accountId: string,
  challengeId: string,
  purpose: "account_email_change_current" | "account_email_change_new",
  code: string,
): string {
  return createHmac("sha256", sessionSecret)
    .update(`${purpose}:${accountId}:${challengeId}:${code}`)
    .digest("hex");
}

function createPreAuthCsrf(nonce: string): string {
  return createHmac("sha256", sessionSecret).update(`pre-auth-csrf:${nonce}`).digest("base64url");
}

export function constantTimeEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

const secureCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

export function setSessionCookie(response: Response, rawToken: string): void {
  response.cookie(SESSION_COOKIE, rawToken, {
    ...secureCookieOptions,
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE, secureCookieOptions);
}

export function setDeviceCookie(response: Response, rawToken: string): void {
  response.cookie(DEVICE_COOKIE, rawToken, {
    ...secureCookieOptions,
    maxAge: DEVICE_COOKIE_MAX_AGE_MS,
  });
}

export function clearDeviceCookie(response: Response): void {
  response.clearCookie(DEVICE_COOKIE, secureCookieOptions);
}

export function issuePreAuthCsrf(response: Response): string {
  const nonce = randomBytes(32).toString("base64url");
  response.cookie(PRE_AUTH_COOKIE, nonce, {
    ...secureCookieOptions,
    maxAge: 15 * 60 * 1000,
  });
  return createPreAuthCsrf(nonce);
}

export function csrfHash(token: string): string {
  return hashToken(token);
}

export async function loadActiveSession(request: Request) {
  const rawToken = request.cookies?.[SESSION_COOKIE];
  if (!rawToken) return null;

  const [row] = await db
    .select({
      sessionId: sessions.id,
      accountId: accounts.id,
      username: accounts.username,
      displayName: accounts.displayName,
      accountType: accounts.accountType,
      accountStatus: accounts.status,
       securityLockedAt: accounts.securityLockedAt,
      onboardingCompletedAt: accounts.onboardingCompletedAt,
      emailVerifiedAt: accountEmails.verifiedAt,
      sessionPasswordPolicyVersion: sessions.passwordPolicyVersion,
      credentialPasswordPolicyVersion: passwordCredentials.passwordPolicyVersion,
       deviceId: trustedDevices.id,
      csrfTokenHash: sessions.csrfTokenHash,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(accounts, eq(sessions.accountId, accounts.id))
    .innerJoin(trustedDevices, and(
      eq(sessions.deviceId, trustedDevices.id),
      eq(trustedDevices.accountId, accounts.id),
      isNull(trustedDevices.revokedAt),
    ))
    .innerJoin(accountEmails, eq(accountEmails.accountId, accounts.id))
    .innerJoin(passwordCredentials, eq(passwordCredentials.accountId, accounts.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(rawToken)),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (
    !row
    || row.accountStatus !== "active"
    || row.securityLockedAt !== null
    || !row.emailVerifiedAt
    || row.credentialPasswordPolicyVersion !== PASSWORD_POLICY_VERSION
    || row.sessionPasswordPolicyVersion !== PASSWORD_POLICY_VERSION
  ) return null;
  return row;
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
    response.status(403).json({
      error: {
        code: "CSRF_REJECTED",
        message: "Origem não permitida.",
        requestId: response.locals.requestId ?? "unknown",
      },
    });
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

  response.status(403).json({
    error: {
      code: "CSRF_REJECTED",
      message: "A solicitação expirou. Atualize a página e tente novamente.",
      requestId: response.locals.requestId ?? "unknown",
    },
  });
};

