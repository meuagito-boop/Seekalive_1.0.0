import { API_ERROR_CODES, type ApiErrorKey } from "@workspace/api-zod";

export type ParsedApiError = {
  code: number;
  key: ApiErrorKey;
  message: string;
  details: Array<{ field: string; message: string }>;
  supportEmail?: string;
  retryAfterSeconds?: number;
  attemptsRemaining?: number;
  resendAvailableAt?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiErrorKey(value: unknown): value is ApiErrorKey {
  return typeof value === "string" && Object.hasOwn(API_ERROR_CODES, value);
}

function readDetails(value: unknown): ParsedApiError["details"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (
      !isRecord(item)
      || typeof item.field !== "string"
      || typeof item.message !== "string"
    ) return [];
    return [{ field: item.field, message: item.message }];
  });
}

function readPositiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : undefined;
}

export function readApiError(
  value: unknown,
  fallbackMessage = "Não foi possível concluir a solicitação.",
): ParsedApiError {
  const outer = isRecord(value) ? value : undefined;
  const data = outer && isRecord(outer.data) ? outer.data : undefined;
  const error = outer && isRecord(outer.error)
    ? outer.error
    : data && isRecord(data.error)
      ? data.error
      : undefined;
  const key = isApiErrorKey(error?.key) ? error.key : "INTERNAL_ERROR";

  return {
    code: API_ERROR_CODES[key],
    key,
    message: typeof error?.message === "string" ? error.message : fallbackMessage,
    details: readDetails(error?.details),
    supportEmail: typeof error?.supportEmail === "string" ? error.supportEmail : undefined,
    retryAfterSeconds: readPositiveInteger(error?.retryAfterSeconds),
    attemptsRemaining: typeof error?.attemptsRemaining === "number"
      && Number.isInteger(error.attemptsRemaining)
      && error.attemptsRemaining >= 0
      ? error.attemptsRemaining
      : undefined,
    resendAvailableAt: typeof error?.resendAvailableAt === "string"
      ? error.resendAvailableAt
      : undefined,
  };
}
