import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/modules/shared/hooks/useToast";
import { useAppContext } from "@/modules/app/state/AppContext";
import {
  confirmDeviceLogin,
  confirmPasswordPolicyUpdate,
  loginAccount,
  resendDeviceLoginCode,
  updatePasswordPolicy,
} from "@/modules/auth/services/loginApi";
import { AuthApiError } from "@/modules/auth/services/http";
import type { AuthResult, DeviceVerificationRequired, PasswordUpdateVerificationRequired } from "@/modules/auth/types";
import {
  loginSchema,
  passwordUpdateSchema,
  type LoginFormValues,
  type PasswordUpdateValues,
} from "@/modules/auth/types/loginSchemas";

export function useLoginFlow() {
  const [showPassword, setShowPassword] = useState(false);
  const [savePassword, setSavePassword] = useState(false);
  const [passwordUpdateRequired, setPasswordUpdateRequired] = useState(false);
  const [deviceChallenge, setDeviceChallenge] = useState<DeviceVerificationRequired | null>(null);
  const [passwordUpdateChallenge, setPasswordUpdateChallenge] = useState<PasswordUpdateVerificationRequired | null>(null);
  const [deviceCode, setDeviceCode] = useState("");
  const [passwordUpdateCode, setPasswordUpdateCode] = useState("");
  const [supportEmail, setSupportEmail] = useState<string | null>(null);
  const [countdownNow, setCountdownNow] = useState(Date.now());
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const {
    setAuthenticatedAccount,
    setPendingVerificationEmail,
    startDevelopmentPreview,
  } = useAppContext();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });
  const passwordUpdateForm = useForm<PasswordUpdateValues>({
    resolver: zodResolver(passwordUpdateSchema),
    defaultValues: { newPassword: "", passwordConfirmation: "" },
  });

  useEffect(() => {
    if (!deviceChallenge) return;
    const interval = window.setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [deviceChallenge]);

  function applyLoginResult(result: AuthResult) {
    setAuthenticatedAccount(result.account);
    setLocation(result.account.onboardingCompleted ? "/feed" : "/onboarding/interests");
  }

  function handleAuthFailure(error: unknown, fallback: string) {
    if (error instanceof AuthApiError && error.key === "SECURITY_LOCKED") {
      setSupportEmail(error.supportEmail ?? null);
      setDeviceChallenge(null);
      setPasswordUpdateChallenge(null);
    }
    toast({
      title: "Não foi possível continuar",
      description: error instanceof Error ? error.message : fallback,
      variant: "destructive",
    });
  }

  async function onSubmit(values: LoginFormValues) {
    try {
      const result = await loginAccount(values);
      if ("challengeId" in result) {
        setSupportEmail(null);
        setDeviceChallenge(result);
        setDeviceCode("");
        return;
      }
      applyLoginResult(result);
    } catch (error) {
      if (error instanceof AuthApiError && error.key === "PASSWORD_UPDATE_REQUIRED") {
        setPasswordUpdateRequired(true);
        passwordUpdateForm.reset();
        toast({
          title: "Atualize sua senha",
          description: "Para continuar, crie uma senha que atenda aos requisitos atuais.",
        });
        return;
      }
      if (error instanceof AuthApiError && error.key === "EMAIL_NOT_VERIFIED") {
        setPendingVerificationEmail(values.identifier.includes("@")
          ? values.identifier.trim().toLowerCase()
          : null);
        toast({ title: "Confirme seu e-mail", description: error.message });
        setLocation("/verify-email");
        return;
      }
      handleAuthFailure(error, "Confira seus dados e tente novamente.");
    }
  }

  async function onPasswordUpdate(values: PasswordUpdateValues) {
    const identifier = form.getValues("identifier").trim();
    const currentPassword = form.getValues("password");
    if (!identifier || !currentPassword) {
      toast({
        title: "Informe suas credenciais atuais",
        description: "Preencha seu usuário ou e-mail e sua senha atual antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const challenge = await updatePasswordPolicy({
        identifier,
        currentPassword,
        newPassword: values.newPassword,
        passwordConfirmation: values.passwordConfirmation,
      });
      setPasswordUpdateChallenge(challenge);
      setPasswordUpdateCode("");
      setSupportEmail(null);
      toast({
        title: "Confirme a alteração",
        description: `Enviamos um código para ${challenge.emailMasked}.`,
      });
    } catch (error) {
      handleAuthFailure(error, "Confira os dados e tente novamente.");
    }
  }

  async function onConfirmPasswordUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordUpdateChallenge) return;
    try {
      await confirmPasswordPolicyUpdate({
        challengeId: passwordUpdateChallenge.challengeId,
        code: passwordUpdateCode,
      });
      const identifier = form.getValues("identifier").trim();
      const newPassword = passwordUpdateForm.getValues("newPassword");
      form.setValue("password", newPassword, { shouldValidate: true });
      setPasswordUpdateChallenge(null);
      setPasswordUpdateRequired(false);
      passwordUpdateForm.reset();
      setPasswordUpdateCode("");
      toast({
        title: "Senha atualizada",
        description: "Por segurança, confirme novamente esta instalação para entrar.",
      });
      const loginResult = await loginAccount({ identifier, password: newPassword });
      if ("challengeId" in loginResult) {
        setDeviceChallenge(loginResult);
        return;
      }
      applyLoginResult(loginResult);
    } catch (error) {
      handleAuthFailure(error, "Confira o código e tente novamente.");
    }
  }

  async function onConfirmDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deviceChallenge) return;
    try {
      const result = await confirmDeviceLogin({
        challengeId: deviceChallenge.challengeId,
        code: deviceCode,
      });
      setDeviceChallenge(null);
      setDeviceCode("");
      applyLoginResult(result);
    } catch (error) {
      if (error instanceof AuthApiError && error.resendAvailableAt) {
        setDeviceChallenge((current) => current
          ? { ...current, resendAvailableAt: error.resendAvailableAt! }
          : current);
      }
      if (error instanceof AuthApiError && error.key === "INVALID_DEVICE_CODE" && error.attemptsRemaining !== undefined) {
        toast({
          title: "Código incorreto",
          description: `Restam ${error.attemptsRemaining} ${error.attemptsRemaining === 1 ? "tentativa" : "tentativas"}. O botão de reenvio mostra quando poderá solicitar outro código.`,
          variant: "destructive",
        });
        return;
      }
      handleAuthFailure(error, "Confira o código e tente novamente.");
    }
  }

  async function onResendDeviceCode() {
    if (!deviceChallenge) return;
    try {
      const result = await resendDeviceLoginCode({ challengeId: deviceChallenge.challengeId });
      setDeviceChallenge((current) => current
        ? { ...current, expiresAt: result.expiresAt, resendAvailableAt: result.resendAvailableAt }
        : current);
      toast({ title: "Código reenviado", description: `Enviamos um novo código para ${deviceChallenge.emailMasked}.` });
    } catch (error) {
      if (error instanceof AuthApiError && error.retryAfterSeconds) {
        setDeviceChallenge((current) => current
          ? { ...current, resendAvailableAt: new Date(Date.now() + error.retryAfterSeconds! * 1000).toISOString() }
          : current);
      }
      handleAuthFailure(error, "Não foi possível reenviar o código.");
    }
  }

  const resendSeconds = deviceChallenge
    ? Math.max(0, Math.ceil((Date.parse(deviceChallenge.resendAvailableAt) - countdownNow) / 1000))
    : 0;

  return {
    form,
    passwordUpdateForm,
    showPassword,
    savePassword,
    passwordUpdateRequired,
    deviceChallenge,
    passwordUpdateChallenge,
    deviceCode,
    passwordUpdateCode,
    supportEmail,
    resendSeconds,
    onSubmit,
    onPasswordUpdate,
    onConfirmPasswordUpdate,
    onConfirmDevice,
    onResendDeviceCode,
    togglePasswordVisibility: () => setShowPassword((visible) => !visible),
    savePasswordChange: setSavePassword,
    changeDeviceCode: (value: string) => setDeviceCode(value.replace(/\D/g, "").slice(0, 6)),
    changePasswordUpdateCode: (value: string) => setPasswordUpdateCode(value.replace(/\D/g, "").slice(0, 6)),
    cancelDeviceChallenge: () => {
      setDeviceChallenge(null);
      setDeviceCode("");
    },
    cancelPasswordUpdateChallenge: () => {
      setPasswordUpdateChallenge(null);
      setPasswordUpdateCode("");
    },
    exploreDevelopmentPreview: async () => {
      await startDevelopmentPreview();
      setLocation("/feed");
    },
  };
}
