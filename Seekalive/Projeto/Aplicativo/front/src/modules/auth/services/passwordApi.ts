import { postJson } from "./http";

export function requestPasswordReset(payload: { email: string }) {
  return postJson<{ status: "reset_requested"; message: string }>("/auth/password/reset/request", payload);
}

export function confirmPasswordReset(payload: {
  email: string;
  code: string;
  newPassword: string;
  passwordConfirmation: string;
}) {
  return postJson<{ status: "password_reset" }>("/auth/password/reset/confirm", payload);
}
