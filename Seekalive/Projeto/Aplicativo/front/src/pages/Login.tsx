import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { passwordPolicySchema } from "@workspace/api-zod";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";
import {
  AuthApiError,
  confirmDeviceLogin,
  confirmPasswordPolicyUpdate,
  loginAccount,
  resendDeviceLoginCode,
  updatePasswordPolicy,
  type AuthResult,
  type DeviceVerificationRequired,
  type PasswordUpdateVerificationRequired,
} from "@/services/authApi";

const schema = z.object({
  identifier: z.string().trim().min(3, "Informe seu nome de usuário ou e-mail"),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres").max(128, "A senha deve ter no máximo 128 caracteres"),
});

type FormValues = z.infer<typeof schema>;

const passwordUpdateSchema = z
  .object({
    newPassword: passwordPolicySchema,
    passwordConfirmation: passwordPolicySchema,
  })
  .superRefine((values, context) => {
    if (values.newPassword !== values.passwordConfirmation) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passwordConfirmation"],
        message: "As senhas não coincidem.",
      });
    }
  });

type PasswordUpdateValues = z.infer<typeof passwordUpdateSchema>;

export default function Login() {
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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
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

  async function onSubmit(values: FormValues) {
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
          <span className="text-2xl font-bold tracking-tight text-foreground">Seekalive</span>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Que bom ter você de volta</p>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">Entrar</h1>
        <p className="mb-8 text-sm leading-6 text-muted-foreground">Acesse sua conta Seekalive e continue de onde parou.</p>
        <p role="note" className="mb-5 rounded-xl border border-border bg-background/70 px-4 py-3 text-xs leading-5 text-muted-foreground">
          O acesso só é liberado depois que o e-mail da conta estiver confirmado.
        </p>

        {!deviceChallenge && !passwordUpdateChallenge && <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      aria-label="Nome de usuário ou e-mail"
                      autoCapitalize="none"
                      autoComplete="username"
                      placeholder="Nome de usuário ou e-mail"
                      data-testid="input-identifier"
                      className="h-12 bg-card border-border text-foreground rounded-xl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        aria-label="Senha"
                        autoComplete={savePassword ? "current-password" : "off"}
                        placeholder="Senha"
                        data-testid="input-password"
                        className="h-12 bg-card border-border text-foreground rounded-xl pr-12"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-right">
              <Link href="/forgot-password" className="text-sm text-primary hover:underline" data-testid="link-forgot-password">
                Esqueci minha senha
              </Link>
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={savePassword}
                onChange={event => setSavePassword(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
                data-testid="checkbox-save-password"
              />
              <span>
                Salvar senha no gerenciador do navegador
                <span className="mt-0.5 block text-xs">O Seekalive não armazena sua senha neste dispositivo.</span>
              </span>
            </label>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-semibold text-base"
              disabled={form.formState.isSubmitting}
              data-testid="button-login"
            >
              {form.formState.isSubmitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </Form>}

        {deviceChallenge && (
          <section aria-labelledby="device-verification-heading" className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <h2 id="device-verification-heading" className="text-lg font-semibold text-foreground">
              Confirme esta instalação
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Como você está entrando por uma instalação ainda não reconhecida, enviamos um código para{" "}
              <strong className="font-medium text-foreground">{deviceChallenge.emailMasked}</strong>.
              Digite o código para concluir o acesso.
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              O código vence em 10 minutos. Há 3 tentativas; depois da primeira e da segunda resposta incorreta, o reenvio aguarda 30 e 90 segundos. No terceiro erro, a conta fica bloqueada e será necessário falar com o suporte.
            </p>
            <form onSubmit={onConfirmDevice} className="mt-4 space-y-4">
              <label htmlFor="device-verification-code" className="block text-sm font-medium text-foreground">
                Código de confirmação
              </label>
              <Input
                id="device-verification-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={deviceCode}
                onChange={(event) => setDeviceCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                aria-describedby="device-verification-expiry"
                className="h-12 rounded-xl border-border bg-card text-foreground tracking-[0.35em]"
                required
              />
              <p id="device-verification-expiry" className="text-xs text-muted-foreground">
                O código expira em 10 minutos. Três códigos incorretos bloqueiam a conta e exigem contato com o suporte.
              </p>
              <Button type="submit" className="w-full min-h-11 rounded-xl" disabled={deviceCode.length !== 6}>
                Confirmar código
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full min-h-11 rounded-xl"
                disabled={resendSeconds > 0}
                onClick={() => void onResendDeviceCode()}
              >
                {resendSeconds > 0 ? `Reenviar código em ${resendSeconds}s` : "Enviar outro código"}
              </Button>
              <button
                type="button"
                className="w-full py-2 text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setDeviceChallenge(null);
                  setDeviceCode("");
                }}
              >
                Voltar ao login
              </button>
            </form>
          </section>
        )}

        {passwordUpdateRequired && !passwordUpdateChallenge && (
          <section
            aria-labelledby="password-policy-heading"
            className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4"
            data-testid="password-policy-update"
          >
            <h2 id="password-policy-heading" className="mb-2 text-base font-semibold text-foreground">
              Atualização obrigatória de senha
            </h2>
            <p className="mb-4 text-sm leading-5 text-muted-foreground">
              A senha atual não atende aos requisitos. Informe uma nova senha para continuar.
            </p>
            <Form {...passwordUpdateForm}>
              <form onSubmit={passwordUpdateForm.handleSubmit(onPasswordUpdate)} className="space-y-4">
                <FormField
                  control={passwordUpdateForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          maxLength={128}
                          aria-label="Nova senha"
                          placeholder="Nova senha"
                          className="h-12 rounded-xl border-border bg-card text-foreground"
                        />
                      </FormControl>
                      <FormDescription>
                        De 8 a 128 caracteres, com maiúscula, minúscula, número e caractere especial.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordUpdateForm.control}
                  name="passwordConfirmation"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          autoComplete="new-password"
                          minLength={8}
                          maxLength={128}
                          aria-label="Confirme a nova senha"
                          placeholder="Confirme a nova senha"
                          className="h-12 rounded-xl border-border bg-card text-foreground"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full rounded-xl"
                  disabled={passwordUpdateForm.formState.isSubmitting}
                  data-testid="button-update-password-policy"
                >
                  {passwordUpdateForm.formState.isSubmitting ? "Atualizando..." : "Atualizar senha e entrar"}
                </Button>
              </form>
            </Form>
          </section>
        )}

        {passwordUpdateChallenge && (
          <section aria-labelledby="password-update-verification-heading" className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <h2 id="password-update-verification-heading" className="text-lg font-semibold text-foreground">
              Confirme a alteração da senha
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Enviamos um código para <strong className="font-medium text-foreground">{passwordUpdateChallenge.emailMasked}</strong>.
              Após confirmar, todas as sessões e instalações confiáveis serão revogadas.
            </p>
            <form onSubmit={onConfirmPasswordUpdate} className="mt-4 space-y-4">
              <label htmlFor="password-update-code" className="block text-sm font-medium text-foreground">
                Código de confirmação
              </label>
              <Input
                id="password-update-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={passwordUpdateCode}
                onChange={(event) => setPasswordUpdateCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="h-12 rounded-xl border-border bg-card text-foreground tracking-[0.35em]"
                required
              />
              <Button type="submit" className="w-full min-h-11 rounded-xl" disabled={passwordUpdateCode.length !== 6}>
                Confirmar alteração
              </Button>
              <button
                type="button"
                className="w-full py-2 text-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  setPasswordUpdateChallenge(null);
                  setPasswordUpdateCode("");
                }}
              >
                Voltar
              </button>
            </form>
          </section>
        )}

        {supportEmail && (
          <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-foreground">
            Para solicitar o desbloqueio da conta, escreva para{" "}
            <a className="font-semibold underline underline-offset-4" href={`mailto:${supportEmail}`}>
              {supportEmail}
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
          <Link href="/register" className="text-primary font-semibold hover:underline" data-testid="link-register">
            Criar conta
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
