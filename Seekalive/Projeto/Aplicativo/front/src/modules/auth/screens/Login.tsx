import { Link } from "wouter";
import { motion } from "framer-motion";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { DeviceVerificationPanel } from "@/modules/auth/components/login/DeviceVerificationPanel";
import { LoginCredentialsForm } from "@/modules/auth/components/login/LoginCredentialsForm";
import { PasswordPolicyUpdateForm } from "@/modules/auth/components/login/PasswordPolicyUpdateForm";
import { PasswordUpdateVerificationPanel } from "@/modules/auth/components/login/PasswordUpdateVerificationPanel";
import { useLoginFlow } from "@/modules/auth/hooks/useLoginFlow";

export default function Login() {
  const flow = useLoginFlow();

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
        <div className="mb-10 flex items-center gap-2">
          <BrandMark className="h-8 w-8" />
          <span className="text-2xl font-bold tracking-tight text-foreground">Seekalive</span>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Que bom ter você de volta</p>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">Entrar</h1>
        <p className="mb-8 text-sm leading-6 text-muted-foreground">
          Acesse sua conta Seekalive e continue de onde parou.
        </p>
        <p role="note" className="mb-5 rounded-xl border border-border bg-background/70 px-4 py-3 text-xs leading-5 text-muted-foreground">
          O acesso só é liberado depois que o e-mail da conta estiver confirmado.
        </p>

        {!flow.deviceChallenge && !flow.passwordUpdateChallenge && (
          <LoginCredentialsForm
            form={flow.form}
            showPassword={flow.showPassword}
            savePassword={flow.savePassword}
            onTogglePassword={flow.togglePasswordVisibility}
            onSavePasswordChange={flow.savePasswordChange}
            onSubmit={flow.onSubmit}
          />
        )}

        {flow.deviceChallenge && (
          <DeviceVerificationPanel
            challenge={flow.deviceChallenge}
            code={flow.deviceCode}
            resendSeconds={flow.resendSeconds}
            onCodeChange={flow.changeDeviceCode}
            onConfirm={flow.onConfirmDevice}
            onResend={() => void flow.onResendDeviceCode()}
            onBack={flow.cancelDeviceChallenge}
          />
        )}

        {flow.passwordUpdateRequired && !flow.passwordUpdateChallenge && (
          <PasswordPolicyUpdateForm
            form={flow.passwordUpdateForm}
            onSubmit={flow.onPasswordUpdate}
          />
        )}

        {flow.passwordUpdateChallenge && (
          <PasswordUpdateVerificationPanel
            challenge={flow.passwordUpdateChallenge}
            code={flow.passwordUpdateCode}
            onCodeChange={flow.changePasswordUpdateCode}
            onConfirm={flow.onConfirmPasswordUpdate}
            onBack={flow.cancelPasswordUpdateChallenge}
          />
        )}

        {flow.supportEmail && (
          <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
            Para solicitar o desbloqueio da conta, escreva para{" "}
            <a className="font-semibold underline underline-offset-4" href={`mailto:${flow.supportEmail}`}>
              {flow.supportEmail}
            </a>.
          </p>
        )}

        {import.meta.env.DEV && (
          <div className="mt-5 rounded-xl border border-primary/25 bg-primary/5 p-4">
            <p className="mb-3 text-xs leading-5 text-muted-foreground">
              Preview de desenvolvimento com dados fictícios. Não cria conta nem sessão real.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => void flow.exploreDevelopmentPreview()}
              data-testid="button-development-preview"
            >
              Explorar demonstração
            </Button>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline" data-testid="link-register">
            Criar conta
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
