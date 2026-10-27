import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiRequestError } from "@/modules/app/api/httpClient";
import {
  confirmPasswordPolicyUpdate,
  loginAccount,
  updatePasswordPolicy,
} from "@/modules/auth/services/loginApi";
import type {
  AuthResult,
  DeviceVerificationRequired,
  PasswordUpdateVerificationRequired,
} from "@/modules/auth/types";
import {
  passwordPolicyUpdateSchema,
  type LoginFormValues,
  type PasswordUpdateFormValues,
} from "./loginFormSchema";

type Notification = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

type Options = {
  getCredentials: () => LoginFormValues;
  onAuthenticated: (result: AuthResult) => void;
  onDeviceChallenge: (challenge: DeviceVerificationRequired) => void;
  onChallengeStarted: () => void;
  onPasswordApplied: (password: string) => void;
  onFailure: (error: unknown, fallback: string) => void;
  notify: (notification: Notification) => void;
};

export function usePasswordPolicyUpdate({
  getCredentials,
  onAuthenticated,
  onDeviceChallenge,
  onChallengeStarted,
  onPasswordApplied,
  onFailure,
  notify,
}: Options) {
  const [required, setRequired] = useState(false);
  const [challenge, setChallenge] =
    useState<PasswordUpdateVerificationRequired | null>(null);
  const [code, setCode] = useState("");
  const form = useForm<PasswordUpdateFormValues>({
    resolver: zodResolver(passwordPolicyUpdateSchema),
    defaultValues: { newPassword: "", passwordConfirmation: "" },
  });

  function requireUpdate() {
    setRequired(true);
    form.reset();
  }

  function cancelChallenge() {
    setChallenge(null);
    setCode("");
  }

  function clearChallenge() {
    cancelChallenge();
  }

  async function submit(values: PasswordUpdateFormValues) {
    const { identifier, password: currentPassword } = getCredentials();
    if (!identifier.trim() || !currentPassword) {
      notify({
        title: "Informe suas credenciais atuais",
        description:
          "Preencha seu usuário ou e-mail e sua senha atual antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const nextChallenge = await updatePasswordPolicy({
        identifier: identifier.trim(),
        currentPassword,
        newPassword: values.newPassword,
        passwordConfirmation: values.passwordConfirmation,
      });
      setChallenge(nextChallenge);
      setCode("");
      onChallengeStarted();
      notify({
        title: "Confirme a alteração",
        description: `Enviamos um código para ${nextChallenge.emailMasked}.`,
      });
    } catch (error) {
      if (error instanceof ApiRequestError && error.key === "SECURITY_LOCKED") {
        clearChallenge();
      }
      onFailure(error, "Confira os dados e tente novamente.");
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;

    try {
      await confirmPasswordPolicyUpdate({
        challengeId: challenge.challengeId,
        code,
      });
      const { identifier } = getCredentials();
      const newPassword = form.getValues("newPassword");
      onPasswordApplied(newPassword);
      setChallenge(null);
      setRequired(false);
      form.reset();
      setCode("");
      notify({
        title: "Senha atualizada",
        description:
          "Por segurança, confirme novamente esta instalação para entrar.",
      });

      const loginResult = await loginAccount({
        identifier: identifier.trim(),
        password: newPassword,
      });
      if ("challengeId" in loginResult) {
        onDeviceChallenge(loginResult);
        return;
      }
      onAuthenticated(loginResult);
    } catch (error) {
      if (error instanceof ApiRequestError && error.key === "SECURITY_LOCKED") {
        clearChallenge();
      }
      onFailure(error, "Confira o código e tente novamente.");
    }
  }

  return {
    required,
    requireUpdate,
    challenge,
    code,
    setCode,
    form,
    submit,
    confirm,
    cancelChallenge,
    clearChallenge,
  };
}
