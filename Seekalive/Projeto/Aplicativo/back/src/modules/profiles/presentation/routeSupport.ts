import type { Request, Response } from "express";
import { loadActiveSession } from "../../../security/session";

export function sendError(response: Response, status: number, code: string, message: string): void {
  response.status(status).json({
    error: { code, message, requestId: response.locals.requestId ?? "unknown" },
  });
}

export async function activeAccountId(request: Request, response: Response): Promise<string | null> {
  const session = await loadActiveSession(request);
  if (!session) {
    sendError(response, 401, "UNAUTHENTICATED", "Entre com uma conta verificada para continuar.");
    return null;
  }
  return session.accountId;
}
