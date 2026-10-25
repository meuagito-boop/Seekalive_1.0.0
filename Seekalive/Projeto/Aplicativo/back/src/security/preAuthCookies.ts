import type { Response } from "express";
import { PRE_AUTH_COOKIE } from "./sessionConfig";

const secureCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

export function setPreAuthCookie(response: Response, nonce: string): void {
  response.cookie(PRE_AUTH_COOKIE, nonce, {
    ...secureCookieOptions,
    maxAge: 15 * 60 * 1000,
  });
}
