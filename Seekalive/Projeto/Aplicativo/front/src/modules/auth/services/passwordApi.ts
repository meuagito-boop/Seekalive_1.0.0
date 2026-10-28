import {
  ConfirmAuthPasswordResetResponse,
  RequestAuthPasswordResetResponse,
} from "@workspace/api-zod";
import { postJson } from "@/modules/app/api/httpClient";

export function requestPasswordReset(payload: { email: string }) {
  return postJson<{ status: "reset_requested"; message: string }>(
    "/auth/password/reset/request",
    payload,
    { 202: RequestAuthPasswordResetResponse },
  );
}

export function confirmPasswordReset(payload: {
  email: string;
  code: string;
  newPassword: string;
  passwordConfirmation: string;
}) {
  return postJson<{ status: "password_reset" }>(
    "/auth/password/reset/confirm",
    payload,
    { 200: ConfirmAuthPasswordResetResponse },
  );
}
