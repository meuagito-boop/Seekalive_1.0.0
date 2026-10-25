import type { Request, Response } from "express";
import type { ApiErrorKey, HttpStatusCode } from "@workspace/api-zod";
import { sendApiError } from "../../../common/apiErrors";
import { loadActiveSession } from "../../../security/session";

export function sendFeedError(
  response: Response,
  status: HttpStatusCode,
  key: ApiErrorKey,
  message: string,
) {
  sendApiError(response, status, key, message);
}

export async function optionalViewerId(request: Request): Promise<string | null> {
  const session = await loadActiveSession(request);
  return session?.accountId ?? null;
}

export async function requiredActorId(
  request: Request,
  response: Response,
): Promise<string | null> {
  const accountId = await optionalViewerId(request);
  if (accountId) return accountId;
  sendFeedError(response, 401, "UNAUTHENTICATED", "Entre com uma conta verificada para continuar.");
  return null;
}

export function isFeedResourceId(value: unknown): value is string {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
