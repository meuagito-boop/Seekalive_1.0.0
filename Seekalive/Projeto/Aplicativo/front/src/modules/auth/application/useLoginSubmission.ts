import { useCallback } from "react";
import { ApiRequestError } from "@/modules/app/api/httpClient";
import { loginAccount } from "@/modules/auth/services/loginApi";
import type {
  AuthResult,
  DeviceVerificationRequired,
} from "@/modules/auth/types";
import type { LoginFormValues } from "./loginFormSchema";

type Options = {
  onAuthenticated: (result: AuthResult) => void;
  onDeviceChallenge: (challenge: DeviceVerificationRequired) => void;
  onPasswordUpdateRequired: () => void;
  onEmailNotVerified: (identifier: string, message: string) => void;
  onFailure: (error: unknown, fallback: string) => void;
};

export function useLoginSubmission({
  onAuthenticated,
  onDeviceChallenge,
  onPasswordUpdateRequired,
  onEmailNotVerified,
  onFailure,
}: Options) {
  const submit = useCallback(
    async (values: LoginFormValues) => {
      try {
        const result = await loginAccount(values);
        if ("challengeId" in result) {
          onDeviceChallenge(result);
          return;
        }
        onAuthenticated(result);
      } catch (error) {
        if (
          error instanceof ApiRequestError &&
          error.key === "PASSWORD_UPDATE_REQUIRED"
        ) {
          onPasswordUpdateRequired();
          return;
        }
        if (
          error instanceof ApiRequestError &&
          error.key === "EMAIL_NOT_VERIFIED"
        ) {
          onEmailNotVerified(
            values.identifier.includes("@")
              ? values.identifier.trim().toLowerCase()
              : "",
            error.message,
          );
          return;
        }
        onFailure(error, "Confira seus dados e tente novamente.");
      }
    },
    [
      onAuthenticated,
      onDeviceChallenge,
      onEmailNotVerified,
      onFailure,
      onPasswordUpdateRequired,
    ],
  );

  return { submit };
}
