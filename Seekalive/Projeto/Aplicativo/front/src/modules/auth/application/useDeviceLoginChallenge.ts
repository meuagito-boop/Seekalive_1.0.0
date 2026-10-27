import { useEffect, useState, type FormEvent } from "react";
import { ApiRequestError } from "@/modules/app/api/httpClient";
import {
  confirmDeviceLogin,
  resendDeviceLoginCode,
} from "@/modules/auth/services/loginApi";
import type {
  AuthResult,
  DeviceVerificationRequired,
} from "@/modules/auth/types";

type Notification = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

type Options = {
  onAuthenticated: (result: AuthResult) => void;
  onFailure: (error: unknown, fallback: string) => void;
  notify: (notification: Notification) => void;
};

export function useDeviceLoginChallenge({
  onAuthenticated,
  onFailure,
  notify,
}: Options) {
  const [challenge, setChallenge] = useState<DeviceVerificationRequired | null>(
    null,
  );
  const [code, setCode] = useState("");
  const [countdownNow, setCountdownNow] = useState(Date.now());

  useEffect(() => {
    if (!challenge) return;
    const interval = window.setInterval(
      () => setCountdownNow(Date.now()),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [challenge]);

  const resendSeconds = challenge
    ? Math.max(
        0,
        Math.ceil(
          (Date.parse(challenge.resendAvailableAt) - countdownNow) / 1000,
        ),
      )
    : 0;

  function begin(nextChallenge: DeviceVerificationRequired) {
    setChallenge(nextChallenge);
    setCode("");
  }

  function cancel() {
    setChallenge(null);
    setCode("");
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;

    try {
      const result = await confirmDeviceLogin({
        challengeId: challenge.challengeId,
        code,
      });
      cancel();
      onAuthenticated(result);
    } catch (error) {
      if (error instanceof ApiRequestError && error.key === "SECURITY_LOCKED") {
        cancel();
      }
      if (error instanceof ApiRequestError && error.resendAvailableAt) {
        setChallenge((current) =>
          current
            ? { ...current, resendAvailableAt: error.resendAvailableAt! }
            : current,
        );
      }
      if (
        error instanceof ApiRequestError &&
        error.key === "INVALID_DEVICE_CODE" &&
        error.attemptsRemaining !== undefined
      ) {
        notify({
          title: "Código incorreto",
          description: `Restam ${error.attemptsRemaining} ${error.attemptsRemaining === 1 ? "tentativa" : "tentativas"}. O botão de reenvio mostra quando poderá solicitar outro código.`,
          variant: "destructive",
        });
        return;
      }
      onFailure(error, "Confira o código e tente novamente.");
    }
  }

  async function resend() {
    if (!challenge) return;

    try {
      const result = await resendDeviceLoginCode({
        challengeId: challenge.challengeId,
      });
      setChallenge((current) =>
        current
          ? {
              ...current,
              expiresAt: result.expiresAt,
              resendAvailableAt: result.resendAvailableAt,
            }
          : current,
      );
      notify({
        title: "Código reenviado",
        description: `Enviamos um novo código para ${challenge.emailMasked}.`,
      });
    } catch (error) {
      if (error instanceof ApiRequestError && error.key === "SECURITY_LOCKED") {
        cancel();
      }
      if (error instanceof ApiRequestError && error.retryAfterSeconds) {
        setChallenge((current) =>
          current
            ? {
                ...current,
                resendAvailableAt: new Date(
                  Date.now() + error.retryAfterSeconds! * 1000,
                ).toISOString(),
              }
            : current,
        );
      }
      onFailure(error, "Não foi possível reenviar o código.");
    }
  }

  return {
    challenge,
    begin,
    cancel,
    code,
    setCode,
    resendSeconds,
    confirm,
    resend,
  };
}
