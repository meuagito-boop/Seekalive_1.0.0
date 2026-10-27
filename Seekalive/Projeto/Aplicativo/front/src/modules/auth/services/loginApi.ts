import { postJson } from "@/modules/app/api/httpClient";
import type {
  AuthResult,
  LoginResult,
  PasswordUpdateVerificationRequired,
} from "../types";

export function loginAccount(payload: {
  identifier: string;
  password: string;
}) {
  return postJson<LoginResult>("/auth/login", payload);
}

export function confirmDeviceLogin(payload: {
  challengeId: string;
  code: string;
}) {
  return postJson<AuthResult>("/auth/device-verification/confirm", payload);
}

export function resendDeviceLoginCode(payload: { challengeId: string }) {
  return postJson<{
    status: "verification_code_resent";
    expiresAt: string;
    resendAvailableAt: string;
  }>("/auth/device-verification/resend", payload);
}

export function updatePasswordPolicy(payload: {
  identifier: string;
  currentPassword: string;
  newPassword: string;
  passwordConfirmation: string;
}) {
  return postJson<PasswordUpdateVerificationRequired>(
    "/auth/password/update",
    payload,
  );
}

export function confirmPasswordPolicyUpdate(payload: {
  challengeId: string;
  code: string;
}) {
  return postJson<{ status: "password_updated" }>(
    "/auth/password/update/confirm",
    payload,
  );
}
