import type { ApiErrorKey } from "@workspace/api-zod";
import { readApiError } from "@/modules/app/api/apiErrors";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: number,
    readonly key: ApiErrorKey,
    readonly details: Array<{ field: string; message: string }> = [],
    readonly supportEmail?: string,
    readonly retryAfterSeconds?: number,
    readonly attemptsRemaining?: number,
    readonly resendAvailableAt?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload =
    response.status === 204
      ? undefined
      : await response.json().catch(() => undefined);
  if (!response.ok) {
    const error = readApiError(payload);
    throw new ApiRequestError(
      error.message,
      response.status,
      error.code,
      error.key,
      error.details,
      error.supportEmail,
      error.retryAfterSeconds,
      error.attemptsRemaining,
      error.resendAvailableAt,
    );
  }
  return payload as T;
}

export async function getCsrfToken(): Promise<string> {
  const response = await fetch("/api/v1/auth/csrf", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const payload = await parseResponse<{ csrfToken: string }>(response);
  return payload.csrfToken;
}

export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`/api/v1${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: body === undefined ? "{}" : JSON.stringify(body),
  });
  return parseResponse<T>(response);
}

export async function deleteJson<T>(path: string): Promise<T> {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`/api/v1${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-CSRF-Token": csrfToken,
    },
  });
  return parseResponse<T>(response);
}

export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return parseResponse<T>(response);
}
