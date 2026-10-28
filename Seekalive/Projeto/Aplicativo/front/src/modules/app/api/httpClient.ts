import {
  GetAuthCsrfTokenResponse,
  type ApiErrorKey,
} from "@workspace/api-zod";
import { readApiError } from "@/modules/app/api/apiErrors";

export type ApiResponseContract = Record<
  number,
  { safeParse(value: unknown): { success: boolean } } | "empty"
>;

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

export class ApiResponseContractError extends Error {
  constructor(readonly status: number) {
    super("A resposta recebida do servidor está incompatível. Tente novamente.");
    this.name = "ApiResponseContractError";
  }
}

async function parseResponse<T>(
  response: Response,
  contract?: ApiResponseContract,
): Promise<T> {
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
  if (contract) {
    const responseValidator = contract[response.status];
    if (responseValidator === undefined) {
      throw new ApiResponseContractError(response.status);
    }
    if (responseValidator === "empty") {
      if (payload !== undefined) {
        throw new ApiResponseContractError(response.status);
      }
      return undefined as T;
    }
    if (!responseValidator.safeParse(payload).success) {
      throw new ApiResponseContractError(response.status);
    }
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
  const payload = await parseResponse<{ csrfToken: string }>(response, {
    200: GetAuthCsrfTokenResponse,
  });
  return payload.csrfToken;
}

export async function postJson<T>(
  path: string,
  body?: unknown,
  contract?: ApiResponseContract,
): Promise<T> {
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
  return parseResponse<T>(response, contract);
}

export async function deleteJson<T>(
  path: string,
  contract?: ApiResponseContract,
): Promise<T> {
  const csrfToken = await getCsrfToken();
  const response = await fetch(`/api/v1${path}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "X-CSRF-Token": csrfToken,
    },
  });
  return parseResponse<T>(response, contract);
}

export async function getJson<T>(
  path: string,
  contract?: ApiResponseContract,
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  return parseResponse<T>(response, contract);
}
