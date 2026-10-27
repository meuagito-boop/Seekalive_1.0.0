import { postJson } from "@/modules/app/api/httpClient";
import type {
  AccountChangeCodeResponse,
  AccountEmailChangeResult,
  AccountPasswordChangeResult,
} from "../types";

export function requestAccountEmailChange(payload: {
  currentPassword: string;
  newEmail: string;
}) {
  return postJson<AccountChangeCodeResponse>(
    "/auth/account/email/change/request",
    payload,
  );
}

export function confirmCurrentAccountEmailChange(payload: {
  challengeId: string;
  code: string;
}) {
  return postJson<AccountChangeCodeResponse>(
    "/auth/account/email/change/confirm-current",
    payload,
  );
}

export function confirmNewAccountEmailChange(payload: {
  challengeId: string;
  code: string;
}) {
  return postJson<AccountEmailChangeResult>(
    "/auth/account/email/change/confirm-new",
    payload,
  );
}

export function requestAccountPasswordChange(payload: {
  currentPassword: string;
  newPassword: string;
  passwordConfirmation: string;
}) {
  return postJson<AccountChangeCodeResponse>(
    "/auth/account/password/change/request",
    payload,
  );
}

export function confirmAccountPasswordChange(payload: {
  challengeId: string;
  code: string;
}) {
  return postJson<AccountPasswordChangeResult>(
    "/auth/account/password/change/confirm",
    payload,
  );
}
