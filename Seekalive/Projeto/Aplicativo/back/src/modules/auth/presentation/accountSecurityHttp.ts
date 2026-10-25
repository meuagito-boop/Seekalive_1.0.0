import type { Request, Response } from "express";
import { loadActiveSession } from "../../../security/session";
import { sendError } from "./responses";

export function sendThrottleError(response: Response, retryAfterSeconds: number): void {
  response.setHeader("Retry-After", String(retryAfterSeconds));
  sendError(
    response,
    429,
    "ACCOUNT_CHANGE_CODE_RATE_LIMITED",
    `Aguarde ${retryAfterSeconds} segundos antes de solicitar outro código.`,
    { retryAfterSeconds },
  );
}

export async function authenticatedAccountId(
  request: Request,
  response: Response,
): Promise<string | null> {
  const session = await loadActiveSession(request);
  if (!session) {
    sendError(
      response,
      401,
      "AUTHENTICATION_REQUIRED",
      "Entre novamente para alterar os dados de segurança.",
    );
    return null;
  }
  return session.accountId;
}
