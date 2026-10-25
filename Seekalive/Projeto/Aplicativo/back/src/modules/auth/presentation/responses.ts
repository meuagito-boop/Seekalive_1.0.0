import type { Response } from "express";
import type { ApiErrorKey, HttpStatusCode } from "@workspace/api-zod";
import { sendApiError, sendApiValidationError } from "../../../common/apiErrors";

export function sendError(
  response: Response,
  status: HttpStatusCode,
  key: ApiErrorKey,
  message: string,
  additional: Record<string, unknown> = {},
): void {
  sendApiError(response, status, key, message, additional);
}

export function sendValidationError(
  response: Response,
  issues: { path: PropertyKey[]; message: string }[],
): void {
  sendApiValidationError(response, issues);
}

export function supportLockMessage(): string {
  return "Acesso bloqueado após três códigos incorretos. Solicite o desbloqueio ao suporte.";
}
