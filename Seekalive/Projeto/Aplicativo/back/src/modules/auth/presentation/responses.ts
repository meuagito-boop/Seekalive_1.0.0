import type { Response } from "express";

export function sendError(
  response: Response,
  status: number,
  code: string,
  message: string,
  additional: Record<string, unknown> = {},
): void {
  response.status(status).json({
    error: { code, message, ...additional, requestId: response.locals.requestId ?? "unknown" },
  });
}

export function sendValidationError(
  response: Response,
  issues: { path: PropertyKey[]; message: string }[],
): void {
  response.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message: "Confira os dados informados.",
      details: issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      requestId: response.locals.requestId ?? "unknown",
    },
  });
}

export function supportLockMessage(): string {
  return "Acesso bloqueado após três códigos incorretos. Solicite o desbloqueio ao suporte.";
}
