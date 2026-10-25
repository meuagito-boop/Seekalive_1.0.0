import type { Response } from "express";
import { API_ERROR_CODES, type ApiErrorKey, type HttpStatusCode } from "@workspace/api-zod";

export type ApiErrorDetail = { field: string; message: string };
export type ApiErrorIssue = { path: PropertyKey[]; message: string };

export function sendApiError(
  response: Response,
  status: HttpStatusCode,
  key: ApiErrorKey,
  message: string,
  additional: Record<string, unknown> = {},
): void {
  response.status(status).json({
    error: {
      ...additional,
      code: API_ERROR_CODES[key],
      key,
      message,
      requestId: response.locals.requestId ?? "unknown",
    },
  });
}

export function sendApiValidationError(
  response: Response,
  issues: ApiErrorIssue[],
  message = "Confira os dados informados.",
): void {
  sendApiError(response, 400, "VALIDATION_ERROR", message, {
    details: issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
}
