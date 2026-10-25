import type { Response } from "express";
import {
  DEVICE_COOKIE,
  DEVICE_COOKIE_MAX_AGE_MS,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "./sessionConfig";

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
