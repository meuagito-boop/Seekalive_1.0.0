import type { Request, Response } from "express";
import type { ApiErrorKey, HttpErrorCode } from "@workspace/api-zod";
import { sendApiError } from "../../../common/apiErrors";
import { loadActiveSession } from "../../../security/session";

export function sendError(
  response: Response,
  status: HttpErrorCode,
  key: ApiErrorKey,
  message: string,
  additional: Record<string, unknown> = {},
): void {
  sendApiError(response, status, key, message, additional);
}

export async function activeAccountId(request: Request, response: Response): Promise<string | null> {
  const session = await loadActiveSession(request);
  if (!session) {
    sendError(response, 401, "UNAUTHENTICATED", "Entre com uma conta verificada para continuar.");
    return null;
  }
  return session.accountId;
}
