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

export function parsePage(request: Request): { limit: number; offset: number } | null {
  const rawLimit = request.query.limit;
  const limit = rawLimit === undefined ? 20 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return null;

  const rawCursor = request.query.cursor;
  if (rawCursor === undefined) return { limit, offset: 0 };
  if (typeof rawCursor !== "string" || rawCursor.length > 32) return null;
  try {
    const decoded = Buffer.from(rawCursor, "base64url").toString("utf8");
    if (!/^(0|[1-9][0-9]{0,6})$/.test(decoded)) return null;
    return { limit, offset: Number(decoded) };
  } catch {
    return null;
  }
}

export function pageResult<T>(rows: T[], limit: number, offset: number) {
  const hasMore = rows.length > limit;
  return {
    items: rows.slice(0, limit),
    nextCursor: hasMore ? Buffer.from(String(offset + limit)).toString("base64url") : null,
  };
}

export function isAccountId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
