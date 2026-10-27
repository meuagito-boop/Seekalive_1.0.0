import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ApiRequestError } from "@/modules/app/api/httpClient";
import { useAppContext } from "@/modules/app/state/AppContext";
import {
  loginFormSchema,
  type LoginFormValues,
} from "@/modules/auth/application/loginFormSchema";
import { useDeviceLoginChallenge } from "@/modules/auth/application/useDeviceLoginChallenge";
import { useLoginSubmission } from "@/modules/auth/application/useLoginSubmission";
import { usePasswordPolicyUpdate } from "@/modules/auth/application/usePasswordPolicyUpdate";
import { DeviceLoginVerificationPanel } from "@/modules/auth/components/login/DeviceLoginVerificationPanel";
import { LoginCredentialsForm } from "@/modules/auth/components/login/LoginCredentialsForm";
import { PasswordPolicyUpdateForm } from "@/modules/auth/components/login/PasswordPolicyUpdateForm";
import { PasswordUpdateVerificationPanel } from "@/modules/auth/components/login/PasswordUpdateVerificationPanel";
import type {
  AuthResult,
  DeviceVerificationRequired,
} from "@/modules/auth/types";

export default function Login() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [savePassword, setSavePassword] = useState(false);
  const {
    setAuthenticatedAccount,
    setPendingVerificationEmail,
    startDevelopmentPreview,
  } = useAppContext();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { identifier: "", password: "" },
  });

  function applyLoginResult(result: AuthResult) {
    setAuthenticatedAccount(result.account);
    setLocation(
      result.account.onboardingCompleted ? "/feed" : "/onboarding/interests",
    );
  }

  function handleAuthFailure(error: unknown, fallback: string) {
    if (error instanceof ApiRequestError && error.key === "SECURITY_LOCKED") {
      setSupportEmail(error.supportEmail ?? null);
    }
    toast({
      title: "Não foi possível continuar",
      description: error instanceof Error ? error.message : fallback,
      variant: "destructive",
    });
  }

  function notify(notification: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) {
    toast(notification);
  }

  const [supportEmail, setSupportEmail] = useState<string | null>(null);
  const deviceLogin = useDeviceLoginChallenge({
    onAuthenticated: applyLoginResult,
    onFailure: handleAuthFailure,
    notify,
  });

  function beginDeviceChallenge(challenge: DeviceVerificationRequired) {
    setSupportEmail(null);
    deviceLogin.begin(challenge);
  }

  const passwordUpdate = usePasswordPolicyUpdate({
    getCredentials: () => form.getValues(),
    onAuthenticated: applyLoginResult,
    onDeviceChallenge: beginDeviceChallenge,
    onChallengeStarted: () => setSupportEmail(null),
    onPasswordApplied: (password) => {
      form.setValue("password", password, { shouldValidate: true });
    },
    onFailure: handleAuthFailure,
    notify,
  });

  const loginSubmission = useLoginSubmission({
    onAuthenticated: applyLoginResult,
    onDeviceChallenge: beginDeviceChallenge,
    onPasswordUpdateRequired: () => {
      passwordUpdate.requireUpdate();
      notify({
        title: "Atualize sua senha",
        description:
          "Para continuar, crie uma senha que atenda aos requisitos atuais.",
      });
    },
    onEmailNotVerified: (identifier, message) => {
      setPendingVerificationEmail(identifier || null);
      notify({ title: "Confirme seu e-mail", description: message });
      setLocation("/verify-email");
    },
    onFailure: handleAuthFailure,
  });

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-32 -top-40 h-96 w-96 rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md rounded-[1.75rem] border border-border bg-card/85 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-9"
      >
        <div className="flex items-center gap-2 mb-10">
          <BrandMark className="h-8 w-8" />
          <span className="text-2xl font-bold tracking-tight text-foreground">
            Seekalive
          </span>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Que bom ter você de volta
        </p>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">
          Entrar
        </h1>
        <p className="mb-8 text-sm leading-6 text-muted-foreground">
          Acesse sua conta Seekalive e continue de onde parou.
        </p>
        <p
          role="note"
          className="mb-5 rounded-xl border border-border bg-background/70 px-4 py-3 text-xs leading-5 text-muted-foreground"
        >
          O acesso só é liberado depois que o e-mail da conta estiver
          confirmado.
        </p>

        {!deviceLogin.challenge && !passwordUpdate.challenge && (
          <LoginCredentialsForm
            form={form}
            onSubmit={loginSubmission.submit}
            showPassword={showPassword}
            savePassword={savePassword}
            onShowPasswordChange={setShowPassword}
            onSavePasswordChange={setSavePassword}
          />
        )}

        {deviceLogin.challenge && (
          <DeviceLoginVerificationPanel
            challenge={deviceLogin.challenge}
            code={deviceLogin.code}
            resendSeconds={deviceLogin.resendSeconds}
            onCodeChange={deviceLogin.setCode}
            onConfirm={deviceLogin.confirm}
            onResend={() => void deviceLogin.resend()}
            onCancel={deviceLogin.cancel}
          />
        )}

        {passwordUpdate.required && !passwordUpdate.challenge && (
          <PasswordPolicyUpdateForm
            form={passwordUpdate.form}
            onSubmit={passwordUpdate.submit}
          />
        )}

        {passwordUpdate.challenge && (
          <PasswordUpdateVerificationPanel
            challenge={passwordUpdate.challenge}
            code={passwordUpdate.code}
            onCodeChange={passwordUpdate.setCode}
            onConfirm={passwordUpdate.confirm}
            onCancel={passwordUpdate.cancelChallenge}
          />
        )}

        {supportEmail && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground"
          >
            Para solicitar o desbloqueio da conta, escreva para{" "}
            <a
              className="font-semibold underline underline-offset-4"
              href={`mailto:${supportEmail}`}
            >
              {supportEmail}
            </a>
            .
          </p>
        )}

        {import.meta.env.DEV && (
          <div className="mt-5 rounded-xl border border-primary/25 bg-primary/5 p-4">
            <p className="mb-3 text-xs leading-5 text-muted-foreground">
              Preview de desenvolvimento com dados fictícios. Não cria conta nem
              sessão real.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => {
                void startDevelopmentPreview().then(() => setLocation("/feed"));
              }}
              data-testid="button-development-preview"
            >
              Explorar demonstração
            </Button>
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground mt-8">
          Ainda não tem conta?{" "}
          <Link
            href="/register"
            className="text-primary font-semibold hover:underline"
            data-testid="link-register"
          >
            Criar conta
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
